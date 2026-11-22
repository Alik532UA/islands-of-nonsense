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

	let canvasEl: HTMLCanvasElement;
	let sim = $state(new Simulation({ botDifficulty: 15, startGold: 500 }));
	let botAI = new BotAI(sim);
	let renderer: ArenaRenderer | null = null;

	let uiTick = $state(0);
	let selectedBuildingId = $state<string | null>(null);
	let selectedPlacedBuildingId = $state<string | null>(null);
	let selectedUnitId = $state<string | null>(null);
	let selectedEntity = $state<SelectedEntity>({ type: 'worker' });

	// RTS Camera Viewport state
	let cameraX = $state(450);
	let cameraY = $state(400);
	let zoom = $state(1.0);

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

	function handleKeyDown(e: KeyboardEvent) {
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
		} else if (
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
		} else if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
			isForgeOpen = !isForgeOpen;
		} else if ((e.key === 'c' || e.key === 'C') && !e.repeat) {
			isCommanderOpen = !isCommanderOpen;
		} else if ((e.key === 'b' || e.key === 'B') && !e.repeat) {
			isShopOpen = !isShopOpen;
		} else if (
			(e.key === 'r' || e.key === 'R') &&
			!e.repeat &&
			!isForgeOpen &&
			!isCommanderOpen &&
			!isShopOpen
		) {
			if (sim.canUseRaceSkill('west')) {
				const success = sim.useRaceSkill('west');
				if (success) {
					sound.playUpgrade();
					uiTick = sim.stateVersion;
				}
			}
		} else if (
			(e.key === 'e' || e.key === 'E') &&
			!e.repeat &&
			!isForgeOpen &&
			!isCommanderOpen &&
			!isShopOpen
		) {
			if (sim.canUseRescueStrike('west')) {
				const res = sim.triggerRescueStrike('west');
				if (res) {
					sound.playRescueStrike();
					uiTick = sim.stateVersion;
				}
			}
		} else if (e.key === 'ArrowLeft') {
			renderer?.setCamera(cameraX - 120, cameraY);
		} else if (e.key === 'ArrowRight') {
			renderer?.setCamera(cameraX + 120, cameraY);
		} else if (e.key === 'ArrowUp') {
			renderer?.setCamera(cameraX, cameraY - 120);
		} else if (e.key === 'ArrowDown') {
			renderer?.setCamera(cameraX, cameraY + 120);
		}
	}

	function handleUpgradeBuilding(instanceId: string, targetDefId: string) {
		const success = sim.upgradeBuilding('west', instanceId, targetDefId);
		if (success) {
			sound.playUpgrade();
			uiTick = sim.stateVersion;
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

	function attachAudioHandlers(s: Simulation) {
		s.onSoundEffect = (type: string) => {
			switch (type) {
				case 'attack_normal':
					sound.playSwordClash();
					break;
				case 'attack_pierce':
					sound.playBowShot();
					break;
				case 'attack_magic':
					sound.playMagicCast();
					break;
				case 'attack_siege':
					sound.playHit();
					break;
				case 'unit_death':
					sound.playUnitDeath();
					break;
				case 'building_destroyed':
					sound.playBuildingDestroyed();
					break;
				case 'building_repair':
					sound.playRepair();
					break;
			}
		};
	}

	onMount(async () => {
		attachAudioHandlers(sim);
		renderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			onCameraChange: (cx: number, cy: number, cz: number) => {
				cameraX = cx;
				cameraY = cy;
				zoom = cz;
			},
			onTileClick: (tileX: number, tileY: number) => {
				if (selectedBuildingId) {
					const success = sim.build('west', selectedBuildingId, tileX, tileY);
					if (success) {
						sound.playBuild();
						selectedBuildingId = null;
						selectedPlacedBuildingId = null;
						selectedEntity = { type: 'worker' };
						uiTick = sim.stateVersion;
					}
				} else {
					const existing = sim.buildings.find(
						(b) => b.team === 'west' && b.tileX === tileX && b.tileY === tileY
					);
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
		const FIXED_STEP = 0.05; // 20 FPS simulation rate

		function gameLoop(now: number) {
			const rawDelta = Math.min(0.25, (now - lastTime) / 1000);
			lastTime = now;

			if (sim.isRunning) {
				accumulator += rawDelta * sim.speed;
				while (accumulator >= FIXED_STEP) {
					sim.step(FIXED_STEP);
					botAI.update(FIXED_STEP);
					accumulator -= FIXED_STEP;
				}
				uiTick = sim.stateVersion;
			}

			animFrameId = requestAnimationFrame(gameLoop);
		}

		animFrameId = requestAnimationFrame(gameLoop);
	});

	onDestroy(() => {
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (countdownTimer) clearInterval(countdownTimer);
		renderer?.destroy();
	});

	function handleNextRound() {
		if (sim.matchWinner) {
			sim.startNewMatch();
		} else {
			sim.round++;
			sim.resetRound();
		}
		uiTick = sim.stateVersion;
		isCommanderOpen = true;
	}

	function handleStartNewMatch(newConfig: SimulationConfig) {
		selectedBuildingId = null;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'worker' };
		isSettingsOpen = false;

		sim = new Simulation(newConfig);
		sim.isRunning = false;
		attachAudioHandlers(sim);
		botAI = new BotAI(sim);
		renderer?.setSimulation(sim);
		uiTick = sim.stateVersion;

		if (newConfig.allRandom) {
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else {
			matchPhase = 'COUNTDOWN';
			chosenWestRace =
				newConfig.westRace && newConfig.westRace !== 'random'
					? newConfig.westRace
					: sim.players.west.race;
			countdownSeconds = 10;
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
		if (chosenWestRace && sim.players.west.race !== chosenWestRace) {
			sim.players.west.race = chosenWestRace;
			if (sim.players.west.worker) {
				sim.players.west.worker.name = getBuilderNameForRace(chosenWestRace);
			}
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
							<p class="text-xs text-slate-400">Оберіть расу до закінчення зворотного відліку</p>
						</div>
						<!-- 10-second countdown badge -->
						<div
							class="px-3.5 py-1.5 bg-amber-500/20 border-2 border-amber-400/80 rounded-2xl flex items-center gap-1.5 animate-pulse"
						>
							<span class="text-xl font-mono font-black text-amber-300">{countdownSeconds}</span>
							<span class="text-[10px] text-amber-200 font-bold uppercase">сек</span>
						</div>
					</div>

					<!-- Race pick chips -->
					<div class="grid grid-cols-4 gap-2 text-xs">
						{#each RACES_LIST as raceDef}
							{@const isSelected = chosenWestRace === raceDef.race}
							<button
								onclick={() => {
									chosenWestRace = raceDef.race;
									sound.playUpgrade();
								}}
								class="p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 {isSelected
									? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 font-bold shadow-lg'
									: 'bg-[#181e2b] border-[#3b3226] hover:border-slate-500 text-slate-300'}"
							>
								<span class="text-xs font-bold">{raceDef.race}</span>
								{#if isSelected}
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
	<VictoryModal {sim} onNextRound={handleNextRound} />
	<StartMatchModal
		isOpen={isSettingsOpen}
		currentConfig={sim.config}
		onClose={() => (isSettingsOpen = false)}
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
