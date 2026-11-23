<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Simulation, type SimulationConfig } from '../lib/engine/simulation';
	import { BotAI } from '../lib/engine/botAI';
	import { ArenaRenderer, type SelectedEntity } from '../lib/renderer/ArenaRenderer';
	import { sound } from '../lib/services/audio';
	import { RACES_LIST, getBuilderNameForRace } from '../lib/engine/gameData';
	import TopBar from '../lib/components/TopBar.svelte';
	import BottomBar from '../lib/components/BottomBar.svelte';
	import ForgeModal from '../lib/components/ForgeModal.svelte';
	import CommanderModal from '../lib/components/CommanderModal.svelte';
	import VictoryModal from '../lib/components/VictoryModal.svelte';
	import ShopModal from '../lib/components/ShopModal.svelte';
	import StartMatchModal from '../lib/components/StartMatchModal.svelte';
	import { storage } from '../lib/services/storage';
	import { createKeySequence, listenForSequences } from '../lib/debug/keySequence';
	import { shortcutLetter, isEditableTarget } from '../lib/hotkeys/hotkeys';
	import { logService } from '../lib/services/logService.svelte';
	import { perfMonitor } from '$lib/debug/perfMonitor.svelte';

	let canvasEl: HTMLCanvasElement;
	let sim = $state(new Simulation({ botDifficulty: 15, startGold: 500, isRunning: false }));
	let botAI: BotAI | null = null;
	let renderer: ArenaRenderer | null = null;

	let uiTick = $state(0);
	let selectedBuildingId = $state<string | null>(null);
	let selectedPlacedBuildingId = $state<string | null>(null);
	let selectedUnitId = $state<string | null>(null);
	let selectedEntity = $state<SelectedEntity>({ type: 'worker' });

	// RTS Camera Viewport state
	let cameraX = $state(800);
	let cameraY = $state(1200);
	let zoom = $state(0.85);

	// Match Lifecycle Phases
	type MatchPhase = 'SETUP' | 'COUNTDOWN' | 'BATTLE';
	let matchPhase = $state<MatchPhase>('SETUP');
	let countdownSeconds = $state(10);
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let chosenWestRace = $state<string>('Люди');

	let isForgeOpen = $state(false);
	let isCommanderOpen = $state(false);
	let isShopOpen = $state(false);
	let isSettingsOpen = $state(true);

	let animFrameId: number;
	let unlistenSequences: (() => void) | null = null;

	function handleKeyDown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;

		const letter = shortcutLetter(e);

		if (e.key === 'Escape') {
			selectedBuildingId = null;
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker' };
			isForgeOpen = false;
			isCommanderOpen = false;
			isShopOpen = false;
			isSettingsOpen = false;
		} else if (e.key === 'F9') {
			e.preventDefault();
			isCommanderOpen = !isCommanderOpen;
		} else {
			const isWorkerGridActive =
				selectedEntity?.type === 'worker' &&
				!selectedPlacedBuildingId &&
				!isForgeOpen &&
				!isCommanderOpen &&
				!isShopOpen &&
				!isSettingsOpen;

			if (
				e.code === 'Space' &&
				!e.repeat &&
				!isForgeOpen &&
				!isCommanderOpen &&
				!isShopOpen &&
				!isSettingsOpen
			) {
				e.preventDefault();
				sim.isRunning = !sim.isRunning;
				uiTick = sim.stateVersion;
			} else if (letter === 'f' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isForgeOpen = !isForgeOpen;
			} else if (letter === 'c' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isCommanderOpen = !isCommanderOpen;
			} else if (letter === 'b' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isShopOpen = !isShopOpen;
			} else if (letter === 'r' && !e.repeat && !isForgeOpen && !isCommanderOpen && !isShopOpen) {
				if (selectedPlacedBuildingId) {
					const bld = sim.buildings.find((b) => b.instanceId === selectedPlacedBuildingId);
					if (bld && bld.team === 'west' && bld.hp < bld.maxHp) {
						const success = sim.repairBuilding('west', selectedPlacedBuildingId);
						if (success) {
							sound.playRepair();
							uiTick = sim.stateVersion;
						}
						return;
					}
				}
				if (selectedEntity?.type === 'castle' && selectedEntity.team === 'west') {
					if (sim.castles.west.hp < sim.castles.west.maxHp) {
						const success = sim.repairBuilding('west', 'castle_west');
						if (success) {
							sound.playRepair();
							uiTick = sim.stateVersion;
						}
						return;
					}
				}
				if (!isWorkerGridActive || e.altKey) {
					if (sim.canUseRaceSkill('west')) {
						const success = sim.useRaceSkill('west');
						if (success) {
							sound.playUpgrade();
							uiTick = sim.stateVersion;
						}
					} else {
						sound.playErrorResource();
					}
				}
			} else if (
				letter === 'e' &&
				!e.repeat &&
				!isForgeOpen &&
				!isCommanderOpen &&
				!isShopOpen &&
				(!isWorkerGridActive || e.altKey)
			) {
				if (sim.canUseRescueStrike('west')) {
					const res = sim.triggerRescueStrike('west');
					if (res) {
						sound.playRescueStrike();
						uiTick = sim.stateVersion;
					}
				}
			} else if (e.key === 'ArrowLeft') {
				renderer?.setCamera(cameraX - 240, cameraY);
			} else if (e.key === 'ArrowRight') {
				renderer?.setCamera(cameraX + 240, cameraY);
			} else if (e.key === 'ArrowUp') {
				renderer?.setCamera(cameraX, cameraY - 240);
			} else if (e.key === 'ArrowDown') {
				renderer?.setCamera(cameraX, cameraY + 240);
			}
		}
	}

	function handleUpgradeBuilding(instanceId: string, targetDefId: string) {
		const success = sim.upgradeBuilding('west', instanceId, targetDefId);
		if (success) {
			sound.playUpgrade();
			uiTick = sim.stateVersion;
		} else {
			sound.playErrorResource();
		}
	}

	function handleSellBuilding(instanceId: string) {
		const success = sim.sellBuilding('west', instanceId);
		if (success) {
			sound.playCoin();
			selectedPlacedBuildingId = null;
			selectedEntity = { type: 'worker' };
			uiTick = sim.stateVersion;
		}
	}

	function handleContinueConstruction(instanceId: string) {
		const success = sim.continueConstruction('west', instanceId);
		if (success) {
			sound.playWorkerAck();
			uiTick = sim.stateVersion;
		}
	}

	function attachAudioHandlers(s: Simulation) {
		s.onSoundEffect = (type: string) => {
			switch (type) {
				case 'sword':
				case 'attack_normal':
					sound.playSwordClash();
					break;
				case 'bow':
				case 'attack_pierce':
					sound.playBowShot();
					break;
				case 'magic':
				case 'attack_magic':
					sound.playMagicCast();
					break;
				case 'hit':
				case 'attack_siege':
					sound.playHit();
					break;
				case 'death':
				case 'unit_death':
					sound.playUnitDeath();
					break;
				case 'buildingDestroyed':
				case 'building_destroyed':
					sound.playBuildingDestroyed();
					break;
				case 'building_repair':
					sound.playRepair();
					break;
				case 'upgrade':
					sound.playUpgrade();
					break;
				case 'coin':
					sound.playCoin();
					break;
				case 'buildingComplete':
					sound.playBuildingComplete();
					break;
				case 'castleUnderAttack':
					sound.playCastleUnderAttack();
					break;
				case 'bossSpawn':
					sound.playBossSpawn();
					break;
				case 'victory':
					sound.playVictory();
					break;
				case 'defeat':
					sound.playDefeat();
					break;
				case 'errorResource':
					sound.playErrorResource();
					break;
				case 'lowCastleHp':
					sound.playLowCastleHp();
					break;
				case 'horn':
					sound.playHorn();
					break;
			}
		};
	}

	onMount(async () => {
		perfMonitor.attachSim(sim);
		botAI = new BotAI(sim);
		attachAudioHandlers(sim);
		const skipStartModal = storage.getJSON<boolean>('skip_start_modal', false);
		if (skipStartModal) {
			isSettingsOpen = false;
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			handleStartNewMatch({
				botDifficulty: saved.botDifficulty ?? 15,
				startGold: saved.startGold ?? 500,
				modeId: saved.modeId ?? 'standard',
				teamSize: (saved.teamSize as 1 | 2 | 3) ?? 1,
				targetWins: saved.targetWins ?? 2,
				coinMode: (saved.coinMode as 'none' | 'normal' | 'crazy') ?? 'normal',
				fogOfWar: saved.fogOfWar ?? true,
				botVsBot: saved.botVsBot ?? false
			});
		} else {
			isSettingsOpen = true;
			sim.isRunning = false;
		}

		renderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			onCameraChange: (cx: number, cy: number, cz: number) => {
				cameraX = cx;
				cameraY = cy;
				zoom = cz;
			},
			onTileClick: (tileX: number, tileY: number, shiftKey = false) => {
				if (selectedBuildingId) {
					const success = sim.build(
						'west',
						selectedBuildingId,
						tileX,
						tileY,
						'top',
						undefined,
						shiftKey
					);
					if (success) {
						sound.playBuild();
						if (!shiftKey) {
							selectedBuildingId = null;
							selectedPlacedBuildingId = null;
							selectedEntity = { type: 'worker' };
						}
						uiTick = sim.stateVersion;
					} else {
						sound.playErrorResource();
					}
				} else {
					const existing = sim.buildings.find((b) => b.tileX === tileX && b.tileY === tileY);
					selectedPlacedBuildingId = existing ? existing.instanceId : null;
					selectedEntity = existing
						? { type: 'building', instanceId: existing.instanceId }
						: { type: 'worker' };
					uiTick = sim.stateVersion;
				}
			},
			onSelectEntity: (entity: SelectedEntity) => {
				selectedEntity = entity;
				if (entity?.type === 'building') {
					selectedPlacedBuildingId = entity.instanceId;
					selectedUnitId = null;
					selectedBuildingId = null;
				} else if (entity?.type === 'unit') {
					selectedUnitId = entity.instanceId;
					selectedPlacedBuildingId = null;
					selectedBuildingId = null;
				} else {
					selectedPlacedBuildingId = null;
					selectedUnitId = null;
				}
				uiTick = sim.stateVersion;
			},
			getSelectedEntity: () => selectedEntity,
			getSelectedBuildingDefId: () => selectedBuildingId,
			getSelectedPlacedBuildingId: () => selectedPlacedBuildingId
		});

		await renderer.init(canvasEl);

		let lastTime = performance.now();
		let accumulator = 0;
		const FIXED_STEP = 1 / 60; // 60 FPS silky-smooth simulation rate

		function gameLoop(now: number) {
			const rawDelta = Math.min(0.25, (now - lastTime) / 1000);
			lastTime = now;

			if (sim.isRunning && !isSettingsOpen) {
				accumulator += rawDelta * sim.speed;
				let stepsCount = 0;
				// Dynamic sub-stepping at high speeds (10x, 50x, 100x) prevents CPU saturation and spiral of death
				const subDt = sim.speed >= 50 ? 1 / 15 : sim.speed >= 10 ? 1 / 30 : FIXED_STEP;
				const maxStepsPerFrame = sim.speed >= 50 ? 15 : sim.speed >= 10 ? 12 : 8;

				while (accumulator >= subDt && stepsCount < maxStepsPerFrame) {
					sim.step(subDt);
					accumulator -= subDt;
					stepsCount++;
				}
				if (accumulator > subDt * 2) {
					accumulator = 0; // Drop accumulated backlog to prevent freeze
				}

				// Bot AI updates once per animation frame with aggregated delta time (only during active battle)
				if (stepsCount > 0 && !sim.winner) {
					const botDt = stepsCount * subDt;
					if (sim.bots && sim.bots.length > 0) {
						sim.updateBots(botDt);
					} else {
						botAI?.update(botDt);
					}
				}
				uiTick = sim.stateVersion;
			}

			animFrameId = requestAnimationFrame(gameLoop);
		}

		animFrameId = requestAnimationFrame(gameLoop);

		unlistenSequences = listenForSequences(
			createKeySequence({
				letter: 'l',
				threshold: 5,
				windowMs: 2500,
				onComplete: handleCopyEntityLog
			})
		);
	});

	onDestroy(() => {
		perfMonitor.detachSim();
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (countdownTimer) clearInterval(countdownTimer);
		if (unlistenSequences) unlistenSequences();
		renderer?.destroy();
	});

	function handleCopyEntityLog() {
		const result = logService.getEntityReport(
			sim,
			selectedEntity,
			selectedPlacedBuildingId,
			selectedUnitId
		);

		if (!result) {
			sound.playErrorResource();
			sim.addFloatingText(
				"Спочатку виберіть об'єкт (юніт, будівля, робітник або замок)!",
				cameraX,
				cameraY,
				'#f87171'
			);
			uiTick = sim.stateVersion;
			return;
		}

		const { report, title } = result;

		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(report).catch(() => {
				const textarea = document.createElement('textarea');
				textarea.value = report;
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			});
		} else if (typeof document !== 'undefined') {
			const textarea = document.createElement('textarea');
			textarea.value = report;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		}

		// Find target position for floating text
		let fx = cameraX;
		let fy = cameraY - 40;
		if (selectedUnitId || selectedEntity?.type === 'unit') {
			const u = sim.units.find(
				(x) =>
					x.instanceId === (selectedUnitId || (selectedEntity as { instanceId: string }).instanceId)
			);
			if (u) {
				fx = u.x;
				fy = u.y - 35;
			}
		} else if (selectedPlacedBuildingId || selectedEntity?.type === 'building') {
			const b = sim.buildings.find(
				(x) =>
					x.instanceId ===
					(selectedPlacedBuildingId || (selectedEntity as { instanceId: string }).instanceId)
			);
			if (b) {
				fx = b.x + 32;
				fy = b.y - 20;
			}
		} else if (selectedEntity?.type === 'worker') {
			const w = sim.players.west?.worker;
			if (w) {
				fx = w.x;
				fy = w.y - 30;
			}
		} else if (selectedEntity?.type === 'castle') {
			const c = sim.castles[selectedEntity.team];
			if (c) {
				fx = c.x;
				fy = c.y - 80;
			}
		}

		sound.playCoin();
		sim.addFloatingText(`Лог ${title} скопійовано! (5x L)`, fx, fy, '#38bdf8');
		logService.info('ui', `Copied diagnostic log for ${title}`);
		uiTick = sim.stateVersion;
	}

	function handleNextRound() {
		if (sim.matchWinner) {
			sim.startNewMatch();
		} else {
			sim.round++;
			sim.resetRound();
		}
		sim.isRunning = true;
		selectedBuildingId = null;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'worker' };
		isCommanderOpen = false;
		isForgeOpen = false;
		isShopOpen = false;
		renderer?.resetCastleVisuals();
		uiTick = sim.stateVersion;
	}

	function handleStartNewMatch(newConfig: SimulationConfig) {
		selectedBuildingId = null;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'worker' };
		isSettingsOpen = false;

		sim = new Simulation(newConfig);
		sim.isRunning = false;
		perfMonitor.attachSim(sim);
		attachAudioHandlers(sim);
		botAI = new BotAI(sim);
		renderer?.setSimulation(sim);
		uiTick = sim.stateVersion;

		if (newConfig.allRandom || newConfig.botVsBot) {
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else {
			matchPhase = 'COUNTDOWN';
			chosenWestRace =
				newConfig.westRace && newConfig.westRace !== 'random'
					? newConfig.westRace
					: sim.players.west.isRandomRace
						? 'random'
						: sim.players.west.race;
			if (chosenWestRace !== 'random' && sim.isRaceBanned(chosenWestRace)) {
				chosenWestRace = sim.getAvailableRaces()[0] || 'Орки';
			}
			countdownSeconds = 15;
			if (countdownTimer) clearInterval(countdownTimer);
			countdownTimer = setInterval(() => {
				countdownSeconds--;
				if (countdownSeconds <= 0) {
					finishCountdownAndStartBattle();
				}
			}, 1000);
		}
	}

	function finishCountdownAndStartBattle() {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		if (chosenWestRace) {
			sim.setPlayerRace('west', chosenWestRace);
		}
		matchPhase = 'BATTLE';
		sim.isRunning = true;
		sound.playHorn();
		uiTick = sim.stateVersion;
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<svelte:head>
	<title>Castle Fight Web</title>
</svelte:head>

<main class="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 select-none">
	<!-- Top Bar: Castles HP, Gold, Income Timer, Controls -->
	<TopBar
		{sim}
		{uiTick}
		onOpenForge={() => (isForgeOpen = true)}
		onOpenCommander={() => (isCommanderOpen = true)}
		onOpenShop={() => (isShopOpen = true)}
		onOpenSettings={() => (isSettingsOpen = true)}
	/>

	<!-- Arena Viewport: Fullscreen Responsive with Pan & Zoom -->
	<div
		class="flex-1 w-full h-full bg-[#090d16] flex items-center justify-center relative overflow-hidden"
	>
		<canvas bind:this={canvasEl} class="w-full h-full block cursor-crosshair select-none"></canvas>

		<!-- Pre-Match 10s Countdown & Race Selection Overlay -->
		{#if matchPhase === 'COUNTDOWN'}
			<div
				class="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4 select-none"
			>
				<div
					class="bg-[#121622] border-2 border-[#8c7456] rounded-3xl p-6 max-w-xl w-full text-center shadow-2xl space-y-4"
					style="box-shadow: 0 10px 40px rgba(0,0,0,0.9);"
				>
					<div class="flex items-center justify-between border-b border-[#3b3226] pb-3">
						<div class="text-left">
							<h3 class="text-base font-bold text-[#fef08a] uppercase tracking-wide">
								Вибір раси королівства
							</h3>
							<p class="text-xs text-slate-400">
								Оберіть расу або випадковий вибір (+30% золота) до закінчення відліку
							</p>
						</div>
						<!-- 15-second countdown badge -->
						<div
							class="px-3.5 py-1.5 bg-amber-500/20 border-2 border-amber-400/80 rounded-2xl flex items-center gap-1.5 animate-pulse"
						>
							<span class="text-xl font-mono font-black text-amber-300">{countdownSeconds}</span>
							<span class="text-[10px] text-amber-200 font-bold uppercase">сек</span>
						</div>
					</div>

					<!-- Race pick chips -->
					<div class="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
						<!-- Random Race Option with +30% gold bonus -->
						<button
							onclick={() => {
								chosenWestRace = 'random';
								sound.playUpgrade();
							}}
							class="p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 {chosenWestRace ===
							'random'
								? 'bg-purple-600/30 border-purple-400 text-purple-200 ring-2 ring-purple-400/50 font-bold shadow-lg'
								: 'bg-[#1e172f] border-purple-800/60 hover:border-purple-600 text-purple-300'}"
						>
							<span class="text-xs font-bold">🎲 Випадкова</span>
							<span class="text-[10px] text-amber-300 font-black">+30% золота</span>
							{#if chosenWestRace === 'random'}
								<span class="text-[9px] text-emerald-400 font-bold">✓ Обрано</span>
							{/if}
						</button>
						{#each RACES_LIST as raceDef}
							{@const isBanned = sim.isRaceBanned(raceDef.race)}
							{@const isOpponentOccupied =
								sim.gameModeConfig.uniqueRaces && sim.players.east.race === raceDef.race}
							{@const isDisabled = isBanned || isOpponentOccupied}
							{@const isSelected = chosenWestRace === raceDef.race}
							<button
								disabled={isDisabled}
								onclick={() => {
									if (!isDisabled) {
										chosenWestRace = raceDef.race;
										sound.playUpgrade();
									}
								}}
								class="p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 {isDisabled
									? 'bg-slate-900/40 border-red-950/60 text-slate-500 opacity-50 cursor-not-allowed'
									: isSelected
										? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 font-bold shadow-lg cursor-pointer'
										: 'bg-[#181e2b] border-[#3b3226] hover:border-slate-500 text-slate-300 cursor-pointer'}"
							>
								<span class="text-xs font-bold {isBanned ? 'line-through text-red-400/80' : ''}">
									{raceDef.race}
								</span>
								{#if isBanned}
									<span class="text-[9px] text-red-400 font-bold">🚫 Бан (-ban)</span>
								{:else if isOpponentOccupied}
									<span class="text-[9px] text-amber-400/80 font-bold">Зайнято (-ur)</span>
								{:else if isSelected}
									<span class="text-[9px] text-emerald-400 font-bold">✓ Обрано</span>
								{/if}
							</button>
						{/each}
					</div>

					<div class="pt-2 flex items-center justify-between border-t border-[#3b3226]">
						<div class="text-left text-xs text-slate-400">
							Суперник (Бот): <strong class="text-amber-300">{sim.players.east.race}</strong>
						</div>
						<button
							onclick={finishCountdownAndStartBattle}
							class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-600/30 cursor-pointer"
						>
							Розпочати бій зараз ⚔️
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom Bar: Buildings Grid 4x3, Tooltip, Race & Lane Selectors -->
	<BottomBar
		{sim}
		{uiTick}
		{cameraX}
		{cameraY}
		{zoom}
		{selectedEntity}
		selectedGroup={selectedEntity?.type === 'group' ? selectedEntity.unitIds : null}
		bind:selectedBuildingId
		bind:selectedPlacedBuildingId
		bind:selectedUnitId
		onSelectBuilding={(id: string | null) => {
			selectedBuildingId = id;
			if (id) {
				selectedPlacedBuildingId = null;
				selectedUnitId = null;
				selectedEntity = { type: 'worker' };
			}
		}}
		onUpgradeBuilding={handleUpgradeBuilding}
		onSellBuilding={handleSellBuilding}
		onContinueConstruction={handleContinueConstruction}
		onMinimapClick={(ax: number, ay: number) => renderer?.setCamera(ax, ay)}
		onClearSelection={() => {
			selectedEntity = { type: 'worker' };
			selectedBuildingId = null;
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			uiTick = sim.stateVersion;
		}}
	/>

	<!-- Modals -->
	<ForgeModal {sim} bind:isOpen={isForgeOpen} />
	<CommanderModal {sim} bind:isOpen={isCommanderOpen} />
	<ShopModal {sim} bind:isOpen={isShopOpen} />
	<VictoryModal
		{sim}
		{uiTick}
		onNextRound={handleNextRound}
		onReselectCommander={() => {
			isCommanderOpen = true;
		}}
	/>
	<StartMatchModal
		isOpen={isSettingsOpen}
		currentConfig={sim.config}
		onClose={() => {
			isSettingsOpen = false;
			if (matchPhase === 'SETUP') {
				handleStartNewMatch(sim.config);
			}
		}}
		onStartMatch={handleStartNewMatch}
	/>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #090d16;
		overflow: hidden;
		user-select: none;
	}
</style>
