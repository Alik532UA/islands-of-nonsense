<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Simulation, type SimulationConfig } from '$lib/engine/simulation';
	import { BotAI } from '$lib/engine/botAI';
	import { ArenaRenderer, type SelectedEntity } from '$lib/renderer/ArenaRenderer';
	import { sound } from '$lib/services/audio';
	import { attachAudioBridge } from '$lib/services/audioBridge';
	import { RACES_LIST } from '$lib/engine/gameData';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';
	import ForgeModal from '$lib/components/ForgeModal.svelte';
	import CommanderModal from '$lib/components/CommanderModal.svelte';
	import VictoryModal from '$lib/components/VictoryModal.svelte';
	import ShopModal from '$lib/components/ShopModal.svelte';
	import MatchConfigModal from '$lib/components/MatchConfigModal.svelte';
	import PauseMenuModal from '$lib/components/PauseMenuModal.svelte';
	import LeaveGameModal from '$lib/components/LeaveGameModal.svelte';
	import HotkeysHelpModal from '$lib/components/HotkeysHelpModal.svelte';
	import A11yAnnouncer from '$lib/components/ui/A11yAnnouncer.svelte';
	import { battleAnnouncer } from '$lib/services/battleAnnouncer.svelte';
	import { ZoomIn, ZoomOut, Compass, HelpCircle } from 'lucide-svelte';
	import { storage } from '$lib/services/storage';
	import { createKeySequence, listenForSequences } from '$lib/debug/keySequence';
	import { shortcutLetter, isEditableTarget } from '$lib/hotkeys/hotkeys';
	import { logService } from '$lib/services/logService.svelte';
	import { perfMonitor } from '$lib/debug/perfMonitor.svelte';
	import type { MatchSync } from '$lib/net/matchSync';
	import { settings } from '$lib/services/settings.svelte';

	let canvasEl: HTMLCanvasElement;
	let sim = $state(new Simulation({ botDifficulty: 15, startGold: 500, isRunning: false }));
	let botAI: BotAI | null = null;
	let renderer: ArenaRenderer | null = null;
	let matchSync = $state<MatchSync | null>(null);

	$effect(() => {
		const style = settings.graphicsStyle;
		renderer?.setGraphicsStyle(style);
	});

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
	let isSettingsOpen = $state(false);
	let isPauseMenuOpen = $state(false);
	let isLeaveModalOpen = $state(false);
	let isHelpOpen = $state(false);
	let pendingLeaveUrl = $state<string | null>(null);
	let allowNavigation = false;

	function openPauseMenu() {
		sim.isRunning = false;
		isPauseMenuOpen = true;
		uiTick = sim.stateVersion;
	}

	function resumeFromPauseMenu() {
		isPauseMenuOpen = false;
		sim.isRunning = true;
		uiTick = sim.stateVersion;
	}

	function handleRestartMatch() {
		isPauseMenuOpen = false;
		handleStartNewMatch(sim.config);
	}

	function handleSurrender() {
		isPauseMenuOpen = false;
		if (matchSync) {
			void matchSync.dispatch('SURRENDER');
		} else {
			sim.castles.west.hp = 0;
			sim.isRunning = false;
		}
		uiTick = sim.stateVersion;
	}

	let animFrameId: number;
	let unlistenSequences: (() => void) | null = null;
	let unlistenAudio: (() => void) | null = null;
	let peerOnline = $state(false);
	let networkNotice = $state<string | null>(null);

	function handleKeyDown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;

		const letter = shortcutLetter(e);

		if (e.key === 'Escape') {
			if (isHelpOpen) {
				isHelpOpen = false;
				return;
			}
			if (isPauseMenuOpen) {
				resumeFromPauseMenu();
				return;
			}
			const hadActiveModalOrSelection =
				selectedBuildingId !== null ||
				selectedPlacedBuildingId !== null ||
				selectedUnitId !== null ||
				isForgeOpen ||
				isCommanderOpen ||
				isShopOpen ||
				isSettingsOpen ||
				isHelpOpen;

			selectedBuildingId = null;
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker' };
			isForgeOpen = false;
			isCommanderOpen = false;
			isShopOpen = false;
			isSettingsOpen = false;
			isHelpOpen = false;

			if (!hadActiveModalOrSelection) {
				openPauseMenu();
			}
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
				battleAnnouncer.announce(sim.isRunning ? 'Гру відновлено' : 'Гру призупинено', 'polite');
				uiTick = sim.stateVersion;
			} else if (letter === 'f' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isForgeOpen = !isForgeOpen;
			} else if (letter === 'c' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isCommanderOpen = !isCommanderOpen;
			} else if (letter === 'b' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				isShopOpen = !isShopOpen;
			} else if (
				(letter === 'h' || e.key === '?') &&
				!e.repeat &&
				(!isWorkerGridActive || e.altKey)
			) {
				isHelpOpen = !isHelpOpen;
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
					const activeTeam = matchSync?.localTeam ?? 'west';
					if (matchSync) {
						if (sim.canUseRaceSkill(activeTeam)) {
							void matchSync.dispatch('USE_ABILITY');
							sound.playUpgrade();
							uiTick = sim.stateVersion;
						} else {
							sound.playErrorResource();
						}
					} else {
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
				}
			} else if (
				letter === 'e' &&
				!e.repeat &&
				!isForgeOpen &&
				!isCommanderOpen &&
				!isShopOpen &&
				(!isWorkerGridActive || e.altKey)
			) {
				const activeTeam = matchSync?.localTeam ?? 'west';
				if (matchSync) {
					if (sim.canUseRescueStrike(activeTeam)) {
						void matchSync.dispatch('RESCUE_STRIKE');
						sound.playRescueStrike();
						uiTick = sim.stateVersion;
					}
				} else {
					if (sim.canUseRescueStrike('west')) {
						const res = sim.triggerRescueStrike('west');
						if (res) {
							sound.playRescueStrike();
							uiTick = sim.stateVersion;
						}
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
		if (matchSync) {
			void matchSync.dispatch('UPGRADE', { targetId: instanceId, buildingType: targetDefId });
			sound.playUpgrade();
			uiTick = sim.stateVersion;
			return;
		}
		const success = sim.upgradeBuilding('west', instanceId, targetDefId);
		if (success) {
			sound.playUpgrade();
			uiTick = sim.stateVersion;
		} else {
			sound.playErrorResource();
		}
	}

	function handleSellBuilding(instanceId: string) {
		if (matchSync) {
			void matchSync.dispatch('SELL', { targetId: instanceId });
			sound.playCoin();
			selectedPlacedBuildingId = null;
			selectedEntity = { type: 'worker' };
			uiTick = sim.stateVersion;
			return;
		}
		const success = sim.sellBuilding('west', instanceId);
		if (success) {
			sound.playCoin();
			selectedPlacedBuildingId = null;
			selectedEntity = { type: 'worker' };
			uiTick = sim.stateVersion;
		}
	}

	function handleContinueConstruction(instanceId: string) {
		if (matchSync) {
			void matchSync.dispatch('REPAIR', { targetId: instanceId });
			sound.playWorkerAck();
			uiTick = sim.stateVersion;
			return;
		}
		const success = sim.continueConstruction('west', instanceId);
		if (success) {
			sound.playWorkerAck();
			uiTick = sim.stateVersion;
		}
	}

	onMount(async () => {
		perfMonitor.attachSim(sim);
		botAI = new BotAI(sim);
		unlistenAudio = attachAudioBridge(sim, sound);
		const searchParams =
			typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
		const urlMode = searchParams?.get('mode');
		const urlRoom = searchParams?.get('room');

		if (urlRoom) {
			isSettingsOpen = false;
			try {
				const { liveNet } = await import('$lib/net/roomNet');
				const { MatchSync: MS } = await import('$lib/net/matchSync');
				const uid = await liveNet.me();
				const isHost = searchParams?.get('host') === '1';
				const localTeam: 'west' | 'east' = isHost ? 'west' : 'east';
				if (!isHost) {
					cameraX = 6400;
					cameraY = 1200;
				}
				const transport = await liveNet.roomTransport(urlRoom);
				matchSync = new MS({
					sim,
					transport,
					localUid: uid,
					localTeam,
					onPeerStatusChange: (status) => {
						peerOnline = status.online;
						networkNotice = status.online ? null : 'Суперник тимчасово офлайн';
					},
					onGone: (reason) => {
						networkNotice = `Мережева сесія завершена: ${reason}`;
					},
					onCommandApplied: () => {
						uiTick = sim.stateVersion;
					}
				});
			} catch (err) {
				logService.warn('network', 'Failed to connect room match sync', { err: String(err) });
			}
		} else if (urlMode === 'sandbox') {
			isSettingsOpen = false;
			handleStartNewMatch({
				botDifficulty: 0,
				startGold: 99999,
				modeId: 'standard',
				teamSize: 1,
				targetWins: 10,
				coinMode: 'crazy',
				fogOfWar: false,
				botVsBot: false
			});
		} else if (urlMode === 'botVsBot') {
			isSettingsOpen = false;
			handleStartNewMatch({
				botDifficulty: 20,
				startGold: 500,
				modeId: 'standard',
				teamSize: 1,
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: false,
				botVsBot: true
			});
		} else if (urlMode === 'allRandom') {
			isSettingsOpen = false;
			handleStartNewMatch({
				botDifficulty: 15,
				startGold: 500,
				modeId: 'allRandom',
				allRandom: true,
				westRace: 'random',
				teamSize: 1,
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: true,
				botVsBot: false
			});
		} else {
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
				botVsBot: saved.botVsBot ?? false,
				westRace: saved.westRace,
				eastRace: saved.eastRace
			});
		}

		renderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			graphicsStyle: settings.graphicsStyle,
			onCameraChange: (cx: number, cy: number, cz: number) => {
				cameraX = cx;
				cameraY = cy;
				zoom = cz;
			},
			onTileClick: (tileX: number, tileY: number, shiftKey = false) => {
				if (selectedBuildingId) {
					const shouldQueue = settings.buildQueueMode === 'convenient' ? !shiftKey : shiftKey;

					if (matchSync) {
						void matchSync.dispatch('BUILD', {
							buildingType: selectedBuildingId,
							x: tileX,
							y: tileY,
							shiftKey: shouldQueue
						});
						sound.playBuild();
						if (!shiftKey) {
							selectedBuildingId = null;
							selectedPlacedBuildingId = null;
							selectedEntity = { type: 'worker' };
						}
					} else {
						const success = sim.build(
							'west',
							selectedBuildingId,
							tileX,
							tileY,
							'top',
							undefined,
							shouldQueue
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
		let lastUiTickTime = 0;
		let lastStateVersion = -1;
		let accumulator = 0;
		const FIXED_STEP = 1 / 60;

		function gameLoop(now: number) {
			const rawDelta = Math.min(0.25, (now - lastTime) / 1000);
			lastTime = now;

			if (sim.isRunning && !isSettingsOpen) {
				accumulator += rawDelta * sim.speed;
				let stepsCount = 0;
				const subDt = sim.speed >= 50 ? 1 / 15 : sim.speed >= 10 ? 1 / 30 : FIXED_STEP;
				const maxStepsPerFrame = sim.speed >= 50 ? 15 : sim.speed >= 10 ? 12 : 8;

				while (accumulator >= subDt && stepsCount < maxStepsPerFrame) {
					sim.step(subDt);
					accumulator -= subDt;
					stepsCount++;
				}
				if (accumulator > subDt * 2) {
					accumulator = 0;
				}

				if (stepsCount > 0 && !sim.winner) {
					const botDt = stepsCount * subDt;
					if (!matchSync) {
						if (sim.bots && sim.bots.length > 0) {
							sim.updateBots(botDt);
						} else {
							botAI?.update(botDt);
						}
					}
				}
				if (stepsCount > 0) {
					battleAnnouncer.updateFromSimulation(sim);
					const stateChanged = sim.stateVersion !== lastStateVersion;
					if (stateChanged || now - lastUiTickTime >= 80) {
						lastUiTickTime = now;
						lastStateVersion = sim.stateVersion;
						uiTick = sim.tick + sim.stateVersion;
					}
				} else {
					uiTick = sim.stateVersion;
				}
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
		matchSync?.dispose();
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (countdownTimer) clearInterval(countdownTimer);
		if (unlistenSequences) unlistenSequences();
		if (unlistenAudio) unlistenAudio();
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
		if (unlistenAudio) unlistenAudio();
		unlistenAudio = attachAudioBridge(sim, sound);
		botAI = new BotAI(sim);
		renderer?.setSimulation(sim);
		uiTick = sim.stateVersion;

		if (newConfig.allRandom || newConfig.botVsBot) {
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else if (newConfig.westRace && newConfig.westRace !== 'in_game') {
			if (newConfig.westRace === 'random') {
				sim.setPlayerRace('west', 'random');
			} else {
				sim.setPlayerRace('west', newConfig.westRace);
			}
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else {
			matchPhase = 'COUNTDOWN';
			chosenWestRace = sim.players.west.race;
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

	function handleRequestLeave(targetUrl: string): boolean {
		if (matchPhase === 'BATTLE' && sim.castles.west.hp > 0 && sim.castles.east.hp > 0) {
			sim.isRunning = false;
			pendingLeaveUrl = targetUrl;
			isPauseMenuOpen = false;
			isLeaveModalOpen = true;
			uiTick = sim.stateVersion;
			return false;
		}
		return true;
	}

	function handleConfirmLeave() {
		allowNavigation = true;
		isLeaveModalOpen = false;
		const target = pendingLeaveUrl || resolve('/play');
		goto(target);
	}

	function handleCancelLeave() {
		isLeaveModalOpen = false;
		pendingLeaveUrl = null;
		if (matchPhase === 'BATTLE' && sim.castles.west.hp > 0 && sim.castles.east.hp > 0) {
			sim.isRunning = true;
		}
		uiTick = sim.stateVersion;
	}

	beforeNavigate(({ cancel, to }) => {
		if (allowNavigation) return;
		if (matchPhase === 'BATTLE' && sim.castles.west.hp > 0 && sim.castles.east.hp > 0) {
			cancel();
			sim.isRunning = false;
			pendingLeaveUrl = to?.url.pathname || resolve('/play');
			isPauseMenuOpen = false;
			isLeaveModalOpen = true;
			uiTick = sim.stateVersion;
		}
	});

	$effect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (matchPhase === 'BATTLE' && sim.castles.west.hp > 0 && sim.castles.east.hp > 0) {
				e.preventDefault();
				e.returnValue = '';
				return '';
			}
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	function selectRaceAndStart(race: string) {
		chosenWestRace = race;
		sound.playUpgrade();
		finishCountdownAndStartBattle();
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

<main class="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 select-none">
	<!-- Top Bar: Castles HP, Gold, Income Timer, Controls -->
	<TopBar
		{sim}
		{uiTick}
		onOpenForge={() => (isForgeOpen = true)}
		onOpenCommander={() => (isCommanderOpen = true)}
		onOpenShop={() => (isShopOpen = true)}
		onOpenSettings={openPauseMenu}
		onBeforeLeave={handleRequestLeave}
	/>

	<!-- Arena Viewport: Fullscreen Responsive with Pan & Zoom -->
	<div
		class="flex-1 w-full h-full bg-[#090d16] flex items-center justify-center relative overflow-hidden"
	>
		<canvas bind:this={canvasEl} class="w-full h-full block cursor-crosshair select-none"></canvas>

		{#if matchSync}
			<div
				class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-md border pointer-events-none {peerOnline
					? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
					: 'bg-amber-950/80 border-amber-500/40 text-amber-300'}"
			>
				<span
					class="inline-block w-2 h-2 rounded-full {peerOnline
						? 'bg-emerald-400 animate-pulse'
						: 'bg-amber-400'}"
				></span>
				<span>
					{peerOnline
						? `Онлайн PvP: ${matchSync.localTeam === 'west' ? 'Захід (Ви)' : 'Схід (Ви)'} vs Суперник`
						: (networkNotice ?? 'Очікування суперника...')}
				</span>
			</div>
		{/if}

		<!-- Pre-Match 10s Countdown & Race Selection Overlay -->
		{#if matchPhase === 'COUNTDOWN'}
			<div
				class="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4 select-none"
			>
				<div
					class="bg-[#121622] border-2 border-[#8c7456] rounded-3xl p-5 max-w-xl w-full text-center shadow-2xl space-y-3"
					style="box-shadow: 0 10px 40px rgba(0,0,0,0.9);"
				>
					<!-- Top Button: Random Race (+30% Gold) with countdown timer -->
					<button
						type="button"
						onclick={() => selectRaceAndStart('random')}
						class="w-full py-2.5 px-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-lg {chosenWestRace ===
						'random'
							? 'bg-purple-600/30 border-purple-400 text-purple-200 ring-2 ring-purple-400/50 font-bold shadow-lg'
							: 'bg-gradient-to-r from-purple-950/70 via-purple-900/50 to-[#181e2b] border-purple-500/60 hover:border-purple-400 hover:bg-purple-900/60 text-purple-200 active:scale-[0.99]'}"
					>
						<div class="flex items-center gap-2.5">
							<span class="text-xl">🎲</span>
							<span class="text-sm font-bold tracking-wide">Випадкова раса</span>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-xs text-amber-300 font-black"
							>
								+30% золота
							</span>
							<div
								class="px-2.5 py-1 bg-amber-500/20 border-2 border-amber-400/80 rounded-xl flex items-center gap-1.5 animate-pulse"
							>
								<span class="text-base font-mono font-black text-amber-300">
									{countdownSeconds}
								</span>
								<span class="text-[10px] text-amber-200 font-bold uppercase">сек</span>
							</div>
						</div>
					</button>

					<!-- Race pick chips (Only the playable races) -->
					<div class="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
						{#each RACES_LIST as raceDef}
							{@const isBanned = sim.isRaceBanned(raceDef.race)}
							{@const isOpponentOccupied =
								sim.gameModeConfig.uniqueRaces && sim.players.east.race === raceDef.race}
							{@const isDisabled = isBanned || isOpponentOccupied}
							{@const isSelected = chosenWestRace === raceDef.race}
							<button
								type="button"
								disabled={isDisabled}
								onclick={() => {
									if (!isDisabled) {
										selectRaceAndStart(raceDef.race);
									}
								}}
								class="p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 {isDisabled
									? 'bg-slate-900/40 border-red-950/60 text-slate-500 opacity-50 cursor-not-allowed'
									: isSelected
										? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 font-bold shadow-lg cursor-pointer'
										: 'bg-[#181e2b] border-[#3b3226] hover:border-amber-400/80 hover:bg-[#202738] text-slate-200 hover:text-white cursor-pointer active:scale-95'}"
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
				</div>
			</div>
		{/if}
	</div>

	{#snippet touchControls()}
		<!-- Viewport & Help Controls under minimap (WCAG 44px touch target) -->
		<div
			class="flex items-center gap-1 select-none touch-manipulation min-w-[44px] min-h-[44px]"
			data-testid="arena-touch-controls"
		>
			<button
				type="button"
				onclick={() => {
					const nz = Math.min(1.5, zoom + 0.15);
					renderer?.setCamera(cameraX, cameraY, nz);
				}}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Наблизити (Zoom In)"
				aria-label="Наблизити"
				data-testid="arena-zoom-in"
			>
				<ZoomIn class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => {
					const nz = Math.max(0.4, zoom - 0.15);
					renderer?.setCamera(cameraX, cameraY, nz);
				}}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Віддалити (Zoom Out)"
				aria-label="Віддалити"
				data-testid="arena-zoom-out"
			>
				<ZoomOut class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => {
					const isWest = (matchSync?.localTeam ?? 'west') === 'west';
					renderer?.setCamera(isWest ? 800 : 6400, 1200);
				}}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Центрувати на замку"
				aria-label="Центрувати на замку"
				data-testid="arena-center-base"
			>
				<Compass class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => (isHelpOpen = true)}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Гарячі клавіші та довідка"
				aria-label="Гарячі клавіші"
				data-testid="arena-help-btn"
			>
				<HelpCircle class="w-3.5 h-3.5" />
			</button>
		</div>
	{/snippet}

	<!-- Bottom Bar: Buildings Grid 4x3, Tooltip, Race & Lane Selectors -->
	<BottomBar
		{sim}
		{uiTick}
		{cameraX}
		{cameraY}
		{zoom}
		{selectedEntity}
		{touchControls}
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
	<MatchConfigModal
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
	<PauseMenuModal
		isOpen={isPauseMenuOpen}
		onResume={resumeFromPauseMenu}
		onRestart={handleRestartMatch}
		onOpenSettings={() => {
			isPauseMenuOpen = false;
			isSettingsOpen = true;
		}}
		onSurrender={handleSurrender}
		onRequestExit={handleRequestLeave}
	/>
	<LeaveGameModal
		isOpen={isLeaveModalOpen}
		onConfirm={handleConfirmLeave}
		onCancel={handleCancelLeave}
	/>
	<HotkeysHelpModal isOpen={isHelpOpen} onClose={() => (isHelpOpen = false)} />
	<A11yAnnouncer />
</main>
