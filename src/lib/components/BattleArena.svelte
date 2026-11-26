<script lang="ts">
	import { onMount, onDestroy, setContext } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Simulation, type SimulationConfig } from '$lib/engine/simulation';
	import {
		ReplaySerializer,
		type MatchReplayData,
		type ReplayAction
	} from '$lib/engine/replaySerializer';
	import { resolveBattleLaunchConfig } from '$lib/engine/matchConfig';
	import { calculateDailyScore, getDailyChallengeSpec } from '$lib/config/dailyChallenge';
	import { submitDailyResult } from '$lib/net/dailyChallenge';
	import { consumePendingReplay, saveMatchReplay } from '$lib/services/replayStore.svelte';
	import { t } from '$lib/i18n';
	import type { PlayerState } from '$lib/engine/types';
	import { BotAI } from '$lib/engine/botAI';
	import { ArenaRenderer, type SelectedEntity } from '$lib/renderer/ArenaRenderer';
	import { sound } from '$lib/services/audio';
	import { attachAudioBridge } from '$lib/services/audioBridge';
	import {
		RACES_LIST,
		PLAYABLE_RACES,
		formatRaceName,
		getBaseBuildingsForRace
	} from '$lib/engine/gameData';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';
	import RadialMenu from '$lib/components/RadialMenu.svelte';
	import ForgeModal from '$lib/components/ForgeModal.svelte';
	import CommanderModal from '$lib/components/CommanderModal.svelte';
	import GuideModal from '$lib/components/GuideModal.svelte';
	import VictoryModal from '$lib/components/VictoryModal.svelte';
	import ShopModal from '$lib/components/ShopModal.svelte';
	import MatchConfigModal from '$lib/components/MatchConfigModal.svelte';
	import PauseMenuModal from '$lib/components/PauseMenuModal.svelte';
	import LeaveGameModal from '$lib/components/LeaveGameModal.svelte';
	import HotkeysHelpModal from '$lib/components/HotkeysHelpModal.svelte';
	import A11yAnnouncer from '$lib/components/ui/A11yAnnouncer.svelte';
	import { battleAnnouncer } from '$lib/services/battleAnnouncer.svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { storage } from '$lib/services/storage';
	import { createKeySequence, listenForSequences } from '$lib/debug/keySequence';
	import { shortcutLetter, shortcutDigit, isEditableTarget } from '$lib/hotkeys/hotkeys';
	import { logService } from '$lib/services/logService.svelte';
	import { perfMonitor } from '$lib/debug/perfMonitor.svelte';
	import type { MatchSync } from '$lib/net/matchSync';
	import type { OnlineBattleSession } from '$lib/net/onlineBattleSession';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import { settings } from '$lib/services/settings.svelte';
	import { recordFinishedMatch } from '$lib/services/matchProgress.svelte';

	let canvasEl: HTMLCanvasElement;
	let sim = $state(new Simulation({ botDifficulty: 15, startGold: 500, isRunning: false }));
	let botAI: BotAI | null = null;
	let renderer: ArenaRenderer | null = null;
	let onlineSession: OnlineBattleSession | null = null;
	let matchSync = $state<MatchSync | null>(null);
	let matchStartedAtMs = Date.now();
	let lastRecordedMatchKey = '';
	let lastEarnedScore = $state<number | null>(null);
	let lastEarnedXp = $state<number | null>(null);
	let matchInstanceSeq = 0;
	let isOnlineSpectator = $state(false);
	let isRescueTargeting = $state(false);
	let isBlinkTargeting = $state(false);
	let lastRescueHotkeyMs = 0;
	let spectatorVision = $state<'all' | 'west' | 'east'>('all');
	let isReplayMode = $state(false);
	let isDailyMode = $state(false);
	let replayData = $state<MatchReplayData | null>(null);
	let savedSerializedReplay = $state<string | null>(null);
	let recordedReplayActions: ReplayAction[] = [];
	let replayActionCursor = 0;
	let isSpectatorView = $derived(isOnlineSpectator || isReplayMode);

	function attachReplayRecorder(targetSim: Simulation) {
		recordedReplayActions = [];
		savedSerializedReplay = null;
		targetSim.onReplayAction = (action) => {
			if (recordedReplayActions.length < 500) {
				recordedReplayActions.push(action);
			}
		};
	}

	function applyReplayActionToSim(targetSim: Simulation, action: ReplayAction) {
		const { team, actionType, payload } = action;
		if (
			actionType === 'BUILD' &&
			payload.buildingType &&
			payload.x !== undefined &&
			payload.y !== undefined
		) {
			targetSim.build(team, payload.buildingType, payload.x, payload.y);
		} else if (actionType === 'UPGRADE' && payload.targetId && payload.buildingType) {
			targetSim.upgradeBuilding(team, payload.targetId, payload.buildingType);
		} else if (actionType === 'SELL' && payload.targetId) {
			targetSim.sellBuilding(team, payload.targetId);
		} else if (actionType === 'REPAIR' && payload.targetId) {
			targetSim.repairBuilding(team, payload.targetId);
		} else if (actionType === 'USE_ABILITY') {
			targetSim.useRaceSkill(team);
		}
	}

	function startReplayPlayback(data: MatchReplayData) {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		onlineSession?.dispose();
		onlineSession = null;
		matchSync = null;
		isOnlineSpectator = false;
		isDailyMode = false;
		isReplayMode = true;
		replayData = data;
		replayActionCursor = 0;
		savedSerializedReplay = null;
		selectedBuildingId = null;
		isRescueTargeting = false;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = null;
		isSettingsOpen = false;
		isPauseMenuOpen = false;
		matchPhase = 'BATTLE';

		const replaySim = new Simulation({
			botDifficulty: 0,
			startGold: data.gameMode === 'sandbox' ? 99999 : 500,
			modeId: data.gameMode,
			teamSize: 1,
			targetWins: 1,
			westRace: data.westRace || data.westCommander,
			eastRace: data.eastRace || data.eastCommander,
			seed: data.randomSeed || 1,
			autoStepBots: false,
			botVsBot: false,
			isRunning: true
		});
		replaySim.bots = [];
		botAI = null;
		sim = replaySim;
		controlledPlayerSlot = sim.players.west?.slot ?? 1;
		perfMonitor.attachSim(sim);
		if (unlistenAudio) unlistenAudio();
		unlistenAudio = attachAudioBridge(sim, sound);
		renderer?.setSimulation(sim);
		renderer?.resetCastleVisuals();
		uiTick = sim.stateVersion;
	}

	$effect(() => {
		const style = settings.graphicsStyle;
		renderer?.setGraphicsStyle(style);
	});

	$effect(() => {
		const _tick = uiTick;
		if (!sim.matchWinner) {
			lastEarnedScore = null;
			lastEarnedXp = null;
			savedSerializedReplay = null;
			return;
		}
		if (!isReplayMode && !isBotVsBot && !savedSerializedReplay) {
			const replayObj: MatchReplayData = {
				version: ReplaySerializer.CURRENT_REPLAY_VERSION,
				mapId: 'classic_bridges',
				gameMode: isDailyMode ? 'daily' : matchSync ? 'online' : (sim.config.modeId ?? 'standard'),
				timestamp: Date.now(),
				randomSeed: sim.config.seed ?? sim.decorationSeed ?? 1,
				westCommander: String(sim.players.west.commander ?? 'none'),
				eastCommander: String(sim.players.east.commander ?? 'none'),
				westRace: formatRaceName(sim.players.west.race),
				eastRace: formatRaceName(sim.players.east.race),
				actions: recordedReplayActions,
				result: {
					winner: sim.matchWinner,
					totalTicks: sim.tick,
					westCastleHp: Math.max(0, Math.round(sim.castles.west.hp)),
					eastCastleHp: Math.max(0, Math.round(sim.castles.east.hp))
				}
			};
			const saved = saveMatchReplay(replayObj);
			savedSerializedReplay = saved.serialized;
		}
		if (isBotVsBot || isSpectatorView) return;
		const matchKey = `${matchSync ? 'online' : isDailyMode ? 'daily' : 'solo'}_${matchInstanceSeq}_${sim.config.seed ?? 0}_${sim.score.west}_${sim.score.east}`;
		if (matchKey === lastRecordedMatchKey) return;
		lastRecordedMatchKey = matchKey;
		const myTeam = matchSync?.localTeam ?? 'west';
		const enemyTeam = myTeam === 'west' ? 'east' : 'west';
		const myPlayer = controlledPlayer;
		const enemyPlayer = sim.players[enemyTeam];
		const mvp = sim.getMvpBuilding(myTeam);
		const durationSec = Math.max(1, Math.round((Date.now() - matchStartedAtMs) / 1000));
		const won = sim.matchWinner === myTeam;
		void recordFinishedMatch({
			matchKey,
			mode: matchSync ? 'online' : 'solo',
			won,
			unitsKilled: sim.players[myTeam].stats.unitsKilled,
			damageToCastle: sim.players[myTeam].stats.damageToCastle,
			botDifficulty: sim.config.botDifficulty,
			durationSec,
			race: myPlayer?.race,
			enemyRace: enemyPlayer?.race,
			westScore: sim.score.west,
			eastScore: sim.score.east,
			mvpBuilding: mvp?.name
		}).then((outcome) => {
			if (outcome) {
				lastEarnedScore = outcome.scoreDelta;
				lastEarnedXp = outcome.rewardSummary?.xpEarned ?? null;
			}
		});
		if (isDailyMode && won) {
			const spec = getDailyChallengeSpec();
			const hpRatio = (sim.castles.west.hp ?? 0) / Math.max(1, sim.castles.west.maxHp ?? 14000);
			const dailyScore = calculateDailyScore({
				won: true,
				durationSec,
				castleHpRatio: hpRatio,
				botDifficulty: spec.botDifficulty,
				income: sim.economySystem.calculateIncome('west', sim.players.west)
			});
			void submitDailyResult(spec, {
				score: dailyScore,
				durationSec,
				race: formatRaceName(myPlayer?.race ?? spec.westRace)
			});
		}
	});

	let uiTick = $state(0);
	let selectedBuildingId = $state<string | null>(null);
	let selectedPlacedBuildingId = $state<string | null>(null);
	let selectedUnitId = $state<string | null>(null);
	let selectedEntity = $state<SelectedEntity>(null);
	let controlledPlayerSlot = $state<number>(1);
	let lastSpaceTime = 0;
	let lastEnterTime = 0;

	function selectOwnWorker(centerCamera = false) {
		const targetPlayer = controlledPlayer;
		selectedBuildingId = null;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'worker', playerSlot: targetPlayer.slot };
		if (centerCamera && targetPlayer.worker) {
			renderer?.setCamera(targetPlayer.worker.x, targetPlayer.worker.y);
		}
		uiTick = sim.stateVersion;
	}

	function selectOwnCastle(centerCamera = false) {
		const targetPlayer = controlledPlayer;
		const castle = sim.castles[targetPlayer.team];
		selectedBuildingId = null;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'castle', team: targetPlayer.team };
		if (centerCamera && castle) {
			renderer?.setCamera(castle.x, castle.y);
		}
		uiTick = sim.stateVersion;
	}

	let onlineLocalTeam = $state<'west' | 'east'>('west');
	let onlineLocalSlot = $state<number>(1);
	let localTeam = $derived<'west' | 'east'>(matchSync ? onlineLocalTeam : 'west');
	let isBotVsBot = $derived(
		!matchSync &&
			(Boolean(sim.config.botVsBot) ||
				(sim.allPlayers?.length > 0 && sim.allPlayers.every((p) => p.isBot)))
	);

	function getControllablePlayerBySlot(slot: number | null | undefined): PlayerState | null {
		if (slot == null) return null;
		const list = sim.allPlayers?.length ? sim.allPlayers : [sim.players.west, sim.players.east];
		const found = list.find((p) => p.slot === slot);
		if (!found) return null;
		if (isBotVsBot || isSpectatorView) return found;
		if (matchSync) return found.slot === onlineLocalSlot ? found : null;
		if (found.team === localTeam) return found;
		return null;
	}

	let controlledPlayer = $derived.by(() => {
		const _tick = uiTick;
		if (matchSync && !isOnlineSpectator) {
			return (
				sim.allPlayers?.find((p) => p.slot === onlineLocalSlot) ??
				(localTeam === 'east' ? sim.players.east : sim.players.west)
			);
		}
		if (selectedEntity?.type === 'worker' && selectedEntity.playerSlot != null) {
			const match = getControllablePlayerBySlot(selectedEntity.playerSlot);
			if (match) return match;
		}
		const fromSlot = getControllablePlayerBySlot(controlledPlayerSlot);
		if (fromSlot) return fromSlot;
		return localTeam === 'east' ? sim.players.east : sim.players.west;
	});

	const routeOnlineCommand: BattleCommandRouter = (type, payload = {}) => {
		if (!matchSync || isOnlineSpectator || (onlineSession && !onlineSession.isPlaying)) {
			return false;
		}
		void matchSync.dispatch(type, {
			team: controlledPlayer.team,
			playerSlot: controlledPlayer.slot,
			...payload
		});
		uiTick = sim.stateVersion;
		return true;
	};
	setContext(BATTLE_COMMAND_ROUTER_KEY, routeOnlineCommand);

	function dispatchCommand(
		type: string,
		payload: Record<string, unknown>,
		offlineAction: () => boolean,
		onSuccess?: () => void
	): boolean {
		if (isSpectatorView) return false;
		if (matchSync) {
			routeOnlineCommand(type, payload);
			onSuccess?.();
			return true;
		}
		const ok = offlineAction();
		if (ok) {
			onSuccess?.();
			uiTick = sim.stateVersion;
		}
		return ok;
	}

	function selectBotControl(slot: number, centerCamera = false) {
		const target = getControllablePlayerBySlot(slot);
		if (!target) return;
		const targetSlot = target.slot ?? slot;
		const alreadySelected =
			selectedEntity?.type === 'worker' && selectedEntity.playerSlot === targetSlot;
		controlledPlayerSlot = targetSlot;
		selectedBuildingId = null;
		isRescueTargeting = false;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = { type: 'worker', playerSlot: targetSlot };
		if ((centerCamera || alreadySelected) && target.worker) {
			renderer?.setCamera(target.worker.x, target.worker.y);
		}
		uiTick = sim.stateVersion;
	}
	let isRadialOpen = $state(false);
	let radialCategory = $state<'army' | 'special' | 'abilities'>('army');

	function toggleRadial(category: 'army' | 'special' | 'abilities') {
		if (isRadialOpen && radialCategory === category) {
			isRadialOpen = false;
		} else {
			radialCategory = category;
			isRadialOpen = true;
		}
	}

	// RTS Camera Viewport state
	let cameraX = $state(800);
	let cameraY = $state(1200);
	let zoom = $state(0.85);

	// Match Lifecycle Phases
	type MatchPhase = 'SETUP' | 'COUNTDOWN' | 'BATTLE';
	let matchPhase = $state<MatchPhase>('SETUP');
	let countdownSeconds = $state(10);
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let chosenWestRace = $state<string | null>(null);
	let onlinePickedRace = $state<string | null>(null);
	let onlineRacePickError = $state<string | null>(null);
	let onlineResumeSent = false;
	let onlineCountdownTimer: ReturnType<typeof setInterval> | null = null;

	let isForgeOpen = $state(false);
	let isCommanderOpen = $state(false);
	let isGuideOpen = $state(false);
	let isShopOpen = $state(false);
	let isSettingsOpen = $state(false);
	let isPauseMenuOpen = $state(false);
	let isLeaveModalOpen = $state(false);
	let isHelpOpen = $state(false);

	function openExclusiveModal(
		target: 'forge' | 'commander' | 'guide' | 'shop' | 'help' | 'settings',
		toggle = false
	): void {
		const alreadyOpen =
			(target === 'forge' && isForgeOpen) ||
			(target === 'commander' && isCommanderOpen) ||
			(target === 'guide' && isGuideOpen) ||
			(target === 'shop' && isShopOpen) ||
			(target === 'help' && isHelpOpen) ||
			(target === 'settings' && isSettingsOpen);

		isForgeOpen = false;
		isCommanderOpen = false;
		isGuideOpen = false;
		isShopOpen = false;
		isHelpOpen = false;
		isSettingsOpen = false;

		if (toggle && alreadyOpen) return;

		if (target === 'forge') isForgeOpen = true;
		else if (target === 'commander') isCommanderOpen = true;
		else if (target === 'guide') isGuideOpen = true;
		else if (target === 'shop') isShopOpen = true;
		else if (target === 'help') isHelpOpen = true;
		else if (target === 'settings') isSettingsOpen = true;
	}
	let pendingLeaveUrl = $state<string | null>(null);
	let allowNavigation = false;

	function openPauseMenu() {
		if (!matchSync) {
			sim.isRunning = false;
		}
		isPauseMenuOpen = true;
		uiTick = sim.stateVersion;
	}

	function resumeFromPauseMenu() {
		isPauseMenuOpen = false;
		if (!matchSync) {
			sim.isRunning = true;
		}
		uiTick = sim.stateVersion;
	}

	function handleRestartMatch() {
		isPauseMenuOpen = false;
		dispatchCommand('RESTART_MATCH', {}, () => {
			handleStartNewMatch(sim.config);
			return true;
		});
	}

	function handleSurrender() {
		isPauseMenuOpen = false;
		dispatchCommand('SURRENDER', {}, () => {
			const loseTeam = isBotVsBot ? controlledPlayer.team : 'west';
			sim.castles[loseTeam].hp = 0;
			sim.isRunning = true;
			sim.step(0.05);
			sim.isRunning = false;
			return true;
		});
		uiTick = sim.stateVersion;
	}

	let animFrameId: number;
	let unlistenSequences: (() => void) | null = null;
	let unlistenAudio: (() => void) | null = null;
	let isOnlineHost = $state(false);
	let peerOnline = $state(false);
	let peerPingMs = $state<number | null>(null);
	let networkNotice = $state<string | null>(null);
	let desyncLogCopied = $state(false);
	let desyncCopyTimer: ReturnType<typeof setTimeout> | null = null;
	const heldPanKeys = new Set<string>();

	function handleCopyDesyncLog() {
		const report = onlineSession?.getSyncDiagnosticLog() ?? networkNotice ?? '';
		if (!report) return;
		const markCopied = () => {
			desyncLogCopied = true;
			if (desyncCopyTimer) clearTimeout(desyncCopyTimer);
			desyncCopyTimer = setTimeout(() => {
				desyncLogCopied = false;
			}, 2500);
		};
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			void navigator.clipboard
				.writeText(report)
				.then(markCopied)
				.catch(() => {});
		}
	}

	function syncKeyboardPan() {
		const allowWasd = settings.controlPreset === 'islands-of-nonsense';
		renderer?.setKeyboardPan({
			left: heldPanKeys.has('ArrowLeft') || (allowWasd && heldPanKeys.has('a')),
			right: heldPanKeys.has('ArrowRight') || (allowWasd && heldPanKeys.has('d')),
			up: heldPanKeys.has('ArrowUp') || (allowWasd && heldPanKeys.has('w')),
			down: heldPanKeys.has('ArrowDown') || (allowWasd && heldPanKeys.has('s'))
		});
	}

	function clearHeldPanKeys() {
		if (heldPanKeys.size === 0) return;
		heldPanKeys.clear();
		renderer?.clearKeyboardPan();
	}

	$effect(() => {
		if (
			isForgeOpen ||
			isCommanderOpen ||
			isShopOpen ||
			isSettingsOpen ||
			isPauseMenuOpen ||
			isLeaveModalOpen ||
			isHelpOpen ||
			matchPhase !== 'BATTLE'
		) {
			clearHeldPanKeys();
		}
	});

	function handleKeyUp(e: KeyboardEvent) {
		const letter = shortcutLetter(e);
		let changed = false;
		if (heldPanKeys.delete(e.key)) changed = true;
		if (letter && heldPanKeys.delete(letter)) changed = true;
		if (changed) {
			syncKeyboardPan();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;

		const letter = shortcutLetter(e);
		const isModalBlocking =
			isForgeOpen ||
			isCommanderOpen ||
			isShopOpen ||
			isSettingsOpen ||
			isPauseMenuOpen ||
			isLeaveModalOpen ||
			isHelpOpen ||
			matchPhase !== 'BATTLE';

		if (
			(e.key === 'ArrowLeft' ||
				e.key === 'ArrowRight' ||
				e.key === 'ArrowUp' ||
				e.key === 'ArrowDown') &&
			!isModalBlocking &&
			!e.ctrlKey &&
			!e.altKey &&
			!e.metaKey
		) {
			e.preventDefault();
			if (!heldPanKeys.has(e.key)) {
				heldPanKeys.add(e.key);
				syncKeyboardPan();
			}
			return;
		}

		if (
			settings.controlPreset === 'islands-of-nonsense' &&
			(letter === 'w' || letter === 'a' || letter === 's' || letter === 'd') &&
			!isModalBlocking &&
			!e.ctrlKey &&
			!e.altKey &&
			!e.metaKey
		) {
			e.preventDefault();
			if (!heldPanKeys.has(letter)) {
				heldPanKeys.add(letter);
				syncKeyboardPan();
			}
			return;
		}

		if (e.key === 'Escape') {
			if (isBlinkTargeting) {
				isBlinkTargeting = false;
				return;
			}
			if (isRescueTargeting) {
				isRescueTargeting = false;
				return;
			}
			if (isRadialOpen) {
				isRadialOpen = false;
				return;
			}
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
				selectedEntity !== null ||
				isForgeOpen ||
				isCommanderOpen ||
				isGuideOpen ||
				isShopOpen ||
				isSettingsOpen ||
				isHelpOpen;

			selectedBuildingId = null;
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = null;
			isForgeOpen = false;
			isCommanderOpen = false;
			isGuideOpen = false;
			isShopOpen = false;
			isSettingsOpen = false;
			isHelpOpen = false;

			if (!hadActiveModalOrSelection) {
				openPauseMenu();
			}
		} else if (e.key === 'F9') {
			e.preventDefault();
			openExclusiveModal('guide', true);
		} else {
			const hasBlockingModal =
				isForgeOpen || isCommanderOpen || isGuideOpen || isShopOpen || isSettingsOpen || isHelpOpen;
			const digit = shortcutDigit(e);
			if (
				!hasBlockingModal &&
				!isSpectatorView &&
				e.altKey &&
				!e.ctrlKey &&
				!e.repeat &&
				(digit === 1 || digit === 2)
			) {
				e.preventDefault();
				const activePlayer = controlledPlayer;
				const activeTeam = activePlayer.team;
				const mode = digit === 1 ? 'short' : 'long';
				if (sim.canFireCastleCannon(activeTeam, mode, activePlayer)) {
					dispatchCommand(
						'CASTLE_SHOT',
						{ targetId: mode },
						() => sim.fireCastleCannon(activeTeam, mode, activePlayer).fired
					);
				} else {
					sound.playErrorResource();
				}
				return;
			}
			const isWorkerGridActive =
				selectedEntity?.type === 'worker' && !selectedPlacedBuildingId && !hasBlockingModal;

			if (e.code === 'Space' && !e.repeat && !hasBlockingModal) {
				e.preventDefault();
				const now = Date.now();
				selectOwnWorker(now - lastSpaceTime < 350);
				lastSpaceTime = now;
			} else if (e.code === 'Enter' && !e.repeat && !hasBlockingModal && !isSpectatorView) {
				e.preventDefault();
				const now = Date.now();
				selectOwnCastle(now - lastEnterTime < 350);
				lastEnterTime = now;
			} else if (letter === 'p' && !e.repeat && !hasBlockingModal) {
				if (isOnlineSpectator) return;
				e.preventDefault();
				if (matchSync) {
					if (onlineSession && !onlineSession.isPlaying) return;
					void matchSync.dispatch(sim.isRunning ? 'PAUSE' : 'RESUME');
					battleAnnouncer.announce(
						sim.isRunning ? 'Надіслано запит паузи' : 'Надіслано запит відновлення',
						'polite'
					);
				} else {
					sim.isRunning = !sim.isRunning;
					battleAnnouncer.announce(sim.isRunning ? 'Гру відновлено' : 'Гру призупинено', 'polite');
				}
				uiTick = sim.stateVersion;
			} else if (isSpectatorView) {
				if ((letter === 'h' || e.key === '?') && !e.repeat && (!isWorkerGridActive || e.altKey)) {
					openExclusiveModal('help', true);
				}
				return;
			} else if (letter === 'f' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				openExclusiveModal('forge', true);
			} else if (letter === 'f' && !e.repeat && isWorkerGridActive && !e.altKey) {
				e.preventDefault();
				activateBlinkTargeting();
			} else if (letter === 'c' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				openExclusiveModal('commander', true);
			} else if (letter === 'b' && !e.repeat && (!isWorkerGridActive || e.altKey)) {
				openExclusiveModal('shop', true);
			} else if (
				(letter === 'h' || e.key === '?') &&
				!e.repeat &&
				(!isWorkerGridActive || e.altKey)
			) {
				openExclusiveModal('help', true);
			} else if (settings.controlPreset === 'islands-of-nonsense') {
				if (letter === 'e' && !e.repeat && !e.ctrlKey && !e.altKey) {
					toggleRadial('army');
				} else if (letter === 'r' && !e.repeat && !e.ctrlKey && !e.altKey) {
					toggleRadial('special');
				} else if (letter === 'q' && !e.repeat && !e.ctrlKey && !e.altKey) {
					toggleRadial('abilities');
				}
			} else {
				if (letter === 'r' && !e.repeat && !hasBlockingModal) {
					if (selectedPlacedBuildingId) {
						const bld = sim.buildings.find((b) => b.instanceId === selectedPlacedBuildingId);
						if (bld && (isBotVsBot || bld.team === localTeam) && bld.hp < bld.maxHp) {
							const owner = getControllablePlayerBySlot(bld.playerSlot) ?? sim.players[bld.team];
							dispatchCommand(
								'REPAIR',
								{ team: bld.team, targetId: selectedPlacedBuildingId },
								() => sim.repairBuilding(bld.team, selectedPlacedBuildingId!, owner),
								() => sound.playRepair()
							);
							return;
						}
					}
					if (
						selectedEntity?.type === 'castle' &&
						(isBotVsBot || selectedEntity.team === localTeam)
					) {
						const cTeam = selectedEntity.team;
						if (sim.castles[cTeam].hp < sim.castles[cTeam].maxHp) {
							const owner = controlledPlayer.team === cTeam ? controlledPlayer : sim.players[cTeam];
							dispatchCommand(
								'REPAIR',
								{ team: cTeam, targetId: `castle_${cTeam}` },
								() => sim.repairBuilding(cTeam, `castle_${cTeam}`, owner),
								() => sound.playRepair()
							);
							return;
						}
					}
					if (!isWorkerGridActive || e.altKey) {
						const targetPlayer = controlledPlayer;
						const activeTeam = targetPlayer.team;
						if (sim.canUseRaceSkill(activeTeam)) {
							dispatchCommand(
								'USE_ABILITY',
								{},
								() => sim.useRaceSkill(activeTeam, targetPlayer),
								() => sound.playUpgrade()
							);
						} else {
							sound.playErrorResource();
						}
					}
				} else if (
					letter === 'e' &&
					!e.repeat &&
					!hasBlockingModal &&
					(!isWorkerGridActive || e.altKey)
				) {
					e.preventDefault();
					activateRescueStrikeTargeting(true);
				}
			}
		}
	}

	function activateBlinkTargeting() {
		if (isSpectatorView) return;
		const activePlayer = controlledPlayer;
		if (!sim.canTeleportWorker(activePlayer.team, activePlayer)) {
			isBlinkTargeting = false;
			sound.playErrorResource();
			return;
		}
		isRescueTargeting = false;
		selectedBuildingId = null;
		isBlinkTargeting = !isBlinkTargeting;
	}

	function executeBlinkAtWorld(worldX: number, worldY: number) {
		if (isSpectatorView) return;
		const activePlayer = controlledPlayer;
		const activeTeam = activePlayer.team;
		isBlinkTargeting = false;
		if (!sim.canTeleportWorker(activeTeam, activePlayer)) {
			sound.playErrorResource();
			return;
		}
		dispatchCommand(
			'ORDER_WORKER_MOVE',
			{ team: activeTeam, playerSlot: activePlayer.slot, targetId: 'blink', worldX, worldY },
			() => sim.teleportWorker(activeTeam, worldX, worldY, activePlayer),
			() => sound.playUpgrade()
		);
	}

	function executeRescueStrikeAtWorld(worldX: number, worldY: number) {
		if (isSpectatorView) return;
		const activePlayer = controlledPlayer;
		const activeTeam = activePlayer.team;
		if (!sim.canUseRescueStrike(activeTeam, activePlayer)) {
			isRescueTargeting = false;
			sound.playErrorResource();
			return;
		}
		if (!sim.isPointOnIsland(activeTeam, worldX, worldY, 0)) {
			sim.addFloatingText('Тільки на своєму острові!', worldX, worldY - 25, '#ef4444');
			sound.playErrorResource();
			uiTick = sim.stateVersion;
			return;
		}
		isRescueTargeting = false;
		const wx = Math.round(worldX);
		const wy = Math.round(worldY);
		const workerDist = activePlayer.worker
			? Math.hypot(activePlayer.worker.x - wx, activePlayer.worker.y - wy)
			: 0;
		dispatchCommand(
			'RESCUE_STRIKE',
			{ worldX: wx, worldY: wy },
			() => Boolean(sim.triggerRescueStrike(activeTeam, activePlayer, wx, wy)),
			() => (workerDist <= 500 ? sound.playRescueStrike() : sound.playWorkerAck())
		);
	}

	function activateRescueStrikeTargeting(allowDoubleTapSelfCast = false) {
		if (isSpectatorView) return;
		const activePlayer = controlledPlayer;
		const activeTeam = activePlayer.team;
		if (!sim.canUseRescueStrike(activeTeam, activePlayer)) {
			isRescueTargeting = false;
			sound.playErrorResource();
			return;
		}
		const now = Date.now();
		if (allowDoubleTapSelfCast && (isRescueTargeting || now - lastRescueHotkeyMs < 400)) {
			lastRescueHotkeyMs = 0;
			const castle = sim.castles[activeTeam];
			executeRescueStrikeAtWorld(castle.x, castle.y);
			return;
		}
		lastRescueHotkeyMs = now;
		selectedBuildingId = null;
		isRescueTargeting = true;
	}

	function handleUpgradeBuilding(instanceId: string, targetDefId: string) {
		const bld = sim.buildings.find((b) => b.instanceId === instanceId);
		const targetTeam = bld?.team ?? controlledPlayer.team;
		const owner =
			(bld?.playerSlot ? getControllablePlayerBySlot(bld.playerSlot) : null) ??
			(controlledPlayer.team === targetTeam ? controlledPlayer : sim.players[targetTeam]);
		const ok = dispatchCommand(
			'UPGRADE',
			{ targetId: instanceId, buildingType: targetDefId },
			() => sim.upgradeBuilding(targetTeam, instanceId, targetDefId, owner),
			() => sound.playUpgrade()
		);
		if (!ok) {
			sound.playErrorResource();
		}
	}

	function handleSellBuilding(instanceId: string) {
		const bld = sim.buildings.find((b) => b.instanceId === instanceId);
		const targetTeam = bld?.team ?? controlledPlayer.team;
		const owner =
			(bld?.playerSlot ? getControllablePlayerBySlot(bld.playerSlot) : null) ??
			(controlledPlayer.team === targetTeam ? controlledPlayer : sim.players[targetTeam]);
		dispatchCommand(
			'SELL',
			{ targetId: instanceId },
			() => sim.sellBuilding(targetTeam, instanceId, owner),
			() => {
				sound.playCoin();
				selectedPlacedBuildingId = null;
				selectedEntity = { type: 'worker', playerSlot: owner.slot };
			}
		);
	}

	function handleContinueConstruction(instanceId: string) {
		const bld = sim.buildings.find((b) => b.instanceId === instanceId);
		const targetTeam = bld?.team ?? controlledPlayer.team;
		const owner =
			(bld?.playerSlot ? getControllablePlayerBySlot(bld.playerSlot) : null) ??
			(controlledPlayer.team === targetTeam ? controlledPlayer : sim.players[targetTeam]);
		dispatchCommand(
			'CONTINUE_BUILD',
			{ targetId: instanceId },
			() => sim.continueConstruction(targetTeam, instanceId, owner),
			() => sound.playWorkerAck()
		);
	}

	onMount(async () => {
		perfMonitor.attachSim(sim);
		botAI = new BotAI(sim);
		unlistenAudio = attachAudioBridge(sim, sound);
		const searchParams =
			typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
		const urlMode = searchParams?.get('mode');
		const urlRoom = searchParams?.get('room');
		const isReplayParam = searchParams?.get('replay') === '1';
		isDailyMode = urlMode === 'daily';

		if (isReplayParam) {
			const consumed = consumePendingReplay();
			if (consumed.data) {
				startReplayPlayback(consumed.data);
			} else {
				const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
				handleStartNewMatch(resolveBattleLaunchConfig(urlMode, saved));
			}
		} else if (urlRoom) {
			isSettingsOpen = false;
			matchPhase = 'BATTLE';
			const { startOnlineBattleSession } = await import('$lib/net/onlineBattleSession');
			onlineSession = await startOnlineBattleSession(urlRoom, searchParams?.get('host') === '1', {
				sim,
				onSimInitialized: (nextSim, init) => {
					sim = nextSim;
					isOnlineSpectator = init.isSpectator;
					onlineLocalTeam = init.localTeam;
					onlineLocalSlot = init.localSlot;
					controlledPlayerSlot = init.localSlot;
					cameraX = init.cameraX;
					cameraY = init.cameraY;
					if (!init.isSpectator) attachReplayRecorder(sim);
					perfMonitor.attachSim(sim);
					if (unlistenAudio) unlistenAudio();
					unlistenAudio = attachAudioBridge(sim, sound);
					if (init.isPlaying && nextSim.allPlayers.some((p) => !p.isBot && p.pendingRacePick)) {
						startOnlineCountdown();
					} else {
						clearOnlineCountdownTimer();
						matchPhase = 'BATTLE';
					}
					uiTick = sim.stateVersion;
				},
				onSimResynced: (nextSim) => {
					sim = nextSim;
					if (!isOnlineSpectator) attachReplayRecorder(sim);
					perfMonitor.attachSim(sim);
					if (unlistenAudio) unlistenAudio();
					unlistenAudio = attachAudioBridge(sim, sound);
					renderer?.setSimulation(sim);
					if (networkNotice?.includes('розсинхронізація')) {
						networkNotice = null;
					}
					uiTick = sim.stateVersion;
				},
				onHostChange: (host) => {
					isOnlineHost = host;
				},
				onPeerStatusChange: (status) => {
					peerOnline = status.peerOnline;
					if (status.notice !== undefined) {
						networkNotice = status.notice;
					}
				},
				onPeerPing: (rtt) => {
					peerPingMs = rtt;
				},
				onDesync: (tick) => {
					networkNotice = `Увага: розсинхронізація на тіку ${tick}`;
				},
				onGone: (reason) => {
					clearOnlineCountdownTimer();
					networkNotice = `Мережева сесія завершена: ${reason}`;
				},
				onCommandApplied: (move) => {
					if (move.type === 'SET_RACE' && matchPhase === 'COUNTDOWN') {
						if (
							onlinePickedRace &&
							controlledPlayer.pendingRacePick &&
							move.payload?.playerSlot === controlledPlayer.slot
						) {
							onlinePickedRace = null;
							onlineRacePickError = 'Расу вже зайнято (-ur), виберіть іншу!';
							sound.playErrorResource();
						} else if (!sim.allPlayers.some((p) => !p.isBot && p.pendingRacePick)) {
							void finalizeOnlineCountdown();
						}
					} else if (move.type === 'RESUME' && matchPhase === 'COUNTDOWN') {
						clearOnlineCountdownTimer();
						matchPhase = 'BATTLE';
						onlinePickedRace = null;
						onlineRacePickError = null;
						sim.isRunning = true;
						sound.playHorn();
						renderer?.resetCastleVisuals();
					} else if (move.type === 'NEXT_ROUND' || move.type === 'RESTART_MATCH') {
						if (move.type === 'RESTART_MATCH') {
							matchInstanceSeq++;
							matchStartedAtMs = Date.now();
							recordedReplayActions = [];
							savedSerializedReplay = null;
						}
						selectedBuildingId = null;
						selectedPlacedBuildingId = null;
						selectedUnitId = null;
						selectedEntity = null;
						isCommanderOpen = false;
						isForgeOpen = false;
						isShopOpen = false;
						renderer?.resetCastleVisuals();
					}
					uiTick = sim.stateVersion;
				},
				onMatchStarted: (nextSim, localSlot, isSpectator, nextLocalTeam) => {
					sim = nextSim;
					isOnlineSpectator = isSpectator;
					onlineLocalTeam = nextLocalTeam;
					onlineLocalSlot = localSlot;
					controlledPlayerSlot = localSlot;
					if (!isSpectator) {
						cameraX = nextLocalTeam === 'east' ? 5600 : 1600;
						cameraY = 1200;
						renderer?.setCamera(cameraX, cameraY);
					}
					if (!isSpectator) attachReplayRecorder(sim);
					perfMonitor.attachSim(sim);
					if (unlistenAudio) unlistenAudio();
					unlistenAudio = attachAudioBridge(sim, sound);
					renderer?.setSimulation(sim);
					renderer?.resetCastleVisuals();
					if (nextSim.allPlayers.some((p) => !p.isBot && p.pendingRacePick)) {
						startOnlineCountdown();
					} else {
						clearOnlineCountdownTimer();
						matchPhase = 'BATTLE';
						sim.isRunning = true;
						sound.playHorn();
					}
					uiTick = sim.stateVersion;
				},
				onErrorNotice: (msg) => {
					networkNotice = msg;
				}
			});
			matchSync = onlineSession?.matchSync ?? null;
			if (!onlineSession && searchParams?.get('host') !== '1') {
				cameraX = 5600;
				cameraY = 1200;
			}
		} else {
			isSettingsOpen = false;
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			handleStartNewMatch(resolveBattleLaunchConfig(urlMode, saved));
		}

		if (!canvasEl) return;
		renderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			graphicsStyle: settings.graphicsStyle,
			onCameraChange: (cx: number, cy: number, cz: number) => {
				cameraX = cx;
				cameraY = cy;
				zoom = cz;
			},
			onWorkerCommand: (cmd) => {
				if (!matchSync || isOnlineSpectator) return false;
				if (cmd.type === 'MOVE_WORKER' || cmd.type === 'ORDER_WORKER_MOVE') {
					return routeOnlineCommand(cmd.type, {
						worldX: Math.round(cmd.worldX),
						worldY: Math.round(cmd.worldY)
					});
				}
				return routeOnlineCommand(cmd.type, { targetId: cmd.targetId });
			},
			onTileClick: (tileX: number, tileY: number, shiftKey = false) => {
				if (selectedBuildingId && !isSpectatorView) {
					const shouldQueue = settings.buildQueueMode === 'convenient' ? !shiftKey : shiftKey;

					if (matchSync) {
						if (onlineSession && !onlineSession.isPlaying) return;
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
							selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
						}
					} else {
						const activeP = controlledPlayer;
						const success = sim.build(
							activeP.team,
							selectedBuildingId,
							tileX,
							tileY,
							'top',
							activeP,
							shouldQueue
						);
						if (success) {
							sound.playBuild();
							if (!shiftKey) {
								selectedBuildingId = null;
								selectedPlacedBuildingId = null;
								selectedEntity = { type: 'worker', playerSlot: activeP.slot };
							}
							uiTick = sim.stateVersion;
						} else {
							sound.playErrorResource();
						}
					}
				} else {
					const existing = sim.buildings.find((b) => b.tileX === tileX && b.tileY === tileY);
					selectedPlacedBuildingId = existing ? existing.instanceId : null;
					selectedEntity = existing ? { type: 'building', instanceId: existing.instanceId } : null;
					if (existing && (isBotVsBot || isSpectatorView)) {
						controlledPlayerSlot =
							existing.playerSlot ??
							sim.players[existing.team].slot ??
							(existing.team === 'east' ? 2 : 1);
					}
					uiTick = sim.stateVersion;
				}
			},
			onSelectEntity: (entity: SelectedEntity) => {
				selectedEntity = entity;
				if (entity?.type === 'building') {
					selectedPlacedBuildingId = entity.instanceId;
					selectedUnitId = null;
					selectedBuildingId = null;
					if (isBotVsBot || isSpectatorView) {
						const b = sim.buildings.find((bld) => bld.instanceId === entity.instanceId);
						if (b) {
							controlledPlayerSlot =
								b.playerSlot ?? sim.players[b.team].slot ?? (b.team === 'east' ? 2 : 1);
						}
					}
				} else if (entity?.type === 'unit') {
					selectedUnitId = entity.instanceId;
					selectedPlacedBuildingId = null;
					selectedBuildingId = null;
				} else if (entity?.type === 'worker') {
					selectedPlacedBuildingId = null;
					selectedUnitId = null;
					if (entity.playerSlot != null && getControllablePlayerBySlot(entity.playerSlot)) {
						controlledPlayerSlot = entity.playerSlot;
					}
				} else if (entity?.type === 'castle') {
					selectedPlacedBuildingId = null;
					selectedUnitId = null;
					if (isBotVsBot || isSpectatorView) {
						controlledPlayerSlot =
							sim.players[entity.team].slot ?? (entity.team === 'east' ? 2 : 1);
					}
				} else {
					selectedPlacedBuildingId = null;
					selectedUnitId = null;
				}
				uiTick = sim.stateVersion;
			},
			getSelectedEntity: () => selectedEntity,
			getSelectedBuildingDefId: () => selectedBuildingId,
			getSelectedPlacedBuildingId: () => selectedPlacedBuildingId,
			getActiveControlPlayer: () => controlledPlayer,
			getControllableSlots: () => {
				if (isBotVsBot || isSpectatorView) return null;
				if (matchSync) return new Set([onlineLocalSlot]);
				return new Set(
					(sim.allPlayers?.length ? sim.allPlayers : [sim.players.west, sim.players.east])
						.filter((p) => p.team === localTeam && typeof p.slot === 'number')
						.map((p) => p.slot as number)
				);
			},
			getIsRescueTargeting: () => isRescueTargeting,
			getSpectatorVision: () => (isSpectatorView ? spectatorVision : null),
			onRescueTargetClick: (worldX: number, worldY: number) => {
				executeRescueStrikeAtWorld(worldX, worldY);
			},
			onCancelRescueTargeting: () => {
				isRescueTargeting = false;
			},
			getIsBlinkTargeting: () => isBlinkTargeting,
			onBlinkTargetClick: (worldX: number, worldY: number) => {
				executeBlinkAtWorld(worldX, worldY);
			},
			onCancelBlinkTargeting: () => {
				isBlinkTargeting = false;
			}
		});

		await renderer.init(canvasEl);
		if (!canvasEl) return;
		if (urlRoom) {
			renderer.setCamera(cameraX, cameraY);
		}

		let lastTime = performance.now();
		let lastUiTickTime = 0;
		let lastStateVersion = -1;
		let lastCheckpointTick = -1;
		let accumulator = 0;
		const FIXED_STEP = 1 / 60;

		function maybeSyncChecksum(serverTargetTick: number | null) {
			if (!matchSync || sim.tick <= 0) return;
			if (sim.tick < lastCheckpointTick) {
				lastCheckpointTick = -1;
			}
			if (sim.tick === lastCheckpointTick) return;
			if (sim.tick % 30 !== 0) return;
			lastCheckpointTick = sim.tick;

			// Stagger CHECKSUM broadcasts per slot across a 450-tick cycle (30 ticks apart)
			// so up to 14 synchronized players never collide on RTDB move seqs
			const slotOffset = ((Math.max(1, matchSync.localSlot) - 1) * 30) % 450;
			const isNearLive = serverTargetTick === null || serverTargetTick - sim.tick <= 30;
			if (!isOnlineSpectator && sim.tick % 450 === slotOffset && isNearLive) {
				void matchSync.broadcastChecksum();
			} else {
				matchSync.recordCheckpointChecksum();
			}
		}

		function gameLoop(now: number) {
			const rawDelta = Math.min(0.25, (now - lastTime) / 1000);
			lastTime = now;

			if (sim.isRunning && (matchSync || !isSettingsOpen)) {
				let stepsCount = 0;
				const subDt = matchSync
					? FIXED_STEP
					: sim.speed >= 50
						? 1 / 15
						: sim.speed >= 10
							? 1 / 30
							: FIXED_STEP;

				const serverTargetTick = onlineSession?.getTargetTick() ?? null;
				if (matchSync && serverTargetTick !== null) {
					const maxCatchupSteps = 12;
					while (sim.tick < serverTargetTick && stepsCount < maxCatchupSteps) {
						matchSync.flushTick(sim.tick);
						sim.step(FIXED_STEP);
						maybeSyncChecksum(serverTargetTick);
						stepsCount++;
					}
					accumulator = 0;
				} else {
					const stepMultiplier = matchSync ? 1 : sim.speed;
					accumulator += rawDelta * stepMultiplier;
					const maxStepsPerFrame = matchSync ? 8 : sim.speed >= 50 ? 15 : sim.speed >= 10 ? 12 : 8;

					while (accumulator >= subDt && stepsCount < maxStepsPerFrame) {
						if (matchSync) {
							matchSync.flushTick(sim.tick);
						} else if (isReplayMode && replayData) {
							while (
								replayActionCursor < replayData.actions.length &&
								replayData.actions[replayActionCursor].tick <= sim.tick
							) {
								applyReplayActionToSim(sim, replayData.actions[replayActionCursor++]);
							}
						}
						sim.step(subDt);
						maybeSyncChecksum(null);
						accumulator -= subDt;
						stepsCount++;
					}
					if (accumulator > subDt * 2) {
						accumulator = 0;
					}
				}

				if (stepsCount > 0 && !sim.winner) {
					const botDt = stepsCount * subDt;
					if (!matchSync && !isReplayMode) {
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
		onlineSession?.dispose();
		onlineSession = null;
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
			const targetPlayer =
				getControllablePlayerBySlot(selectedEntity.playerSlot) ?? controlledPlayer;
			const w = targetPlayer?.worker;
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
		if (isSpectatorView) return;
		if (matchSync) {
			if (sim.matchWinner) {
				void matchSync.dispatch('RESTART_MATCH');
			} else {
				void matchSync.dispatch('NEXT_ROUND', { round: sim.round });
			}
			return;
		}
		if (sim.matchWinner) {
			matchInstanceSeq++;
			matchStartedAtMs = Date.now();
			recordedReplayActions = [];
			savedSerializedReplay = null;
			sim.startNewMatch();
		} else {
			sim.round++;
			sim.resetRound();
		}
		sim.isRunning = true;
		selectedBuildingId = null;
		isRescueTargeting = false;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = null;
		isCommanderOpen = false;
		isForgeOpen = false;
		isShopOpen = false;
		renderer?.resetCastleVisuals();
		uiTick = sim.stateVersion;
	}

	function handleStartNewMatch(newConfig: SimulationConfig) {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		selectedBuildingId = null;
		isRescueTargeting = false;
		selectedPlacedBuildingId = null;
		selectedUnitId = null;
		selectedEntity = null;
		isSettingsOpen = false;
		isPauseMenuOpen = false;
		isCommanderOpen = false;
		isGuideOpen = false;
		isForgeOpen = false;
		isShopOpen = false;

		sim = new Simulation(newConfig);
		isReplayMode = false;
		replayData = null;
		attachReplayRecorder(sim);
		matchInstanceSeq++;
		matchStartedAtMs = Date.now();
		controlledPlayerSlot = sim.players.west?.slot ?? 1;
		sim.isRunning = false;
		perfMonitor.attachSim(sim);
		if (unlistenAudio) unlistenAudio();
		unlistenAudio = attachAudioBridge(sim, sound);
		botAI = new BotAI(sim);
		renderer?.setSimulation(sim);
		renderer?.resetCastleVisuals();
		uiTick = sim.stateVersion;

		if (sim.gameModeConfig.allRandom || newConfig.allRandom || newConfig.botVsBot) {
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else if (newConfig.westRace && newConfig.westRace !== 'in_game') {
			if (
				newConfig.westRace !== 'random' &&
				formatRaceName(sim.players.west.race) !== formatRaceName(newConfig.westRace)
			) {
				sim.setPlayerRace('west', newConfig.westRace);
			}
			matchPhase = 'BATTLE';
			sim.isRunning = true;
			sound.playHorn();
		} else {
			matchPhase = 'COUNTDOWN';
			chosenWestRace = null;
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
			if (!matchSync) sim.isRunning = false;
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
		if (
			!matchSync &&
			matchPhase === 'BATTLE' &&
			sim.castles.west.hp > 0 &&
			sim.castles.east.hp > 0
		) {
			sim.isRunning = true;
		}
		uiTick = sim.stateVersion;
	}

	beforeNavigate(({ cancel, to }) => {
		if (allowNavigation) return;
		if (matchPhase === 'BATTLE' && sim.castles.west.hp > 0 && sim.castles.east.hp > 0) {
			cancel();
			if (!matchSync) sim.isRunning = false;
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

	function clearOnlineCountdownTimer() {
		if (onlineCountdownTimer) {
			clearInterval(onlineCountdownTimer);
			onlineCountdownTimer = null;
		}
	}

	async function finalizeOnlineCountdown() {
		const isCoordinator = onlineSession ? onlineSession.isCountdownCoordinator : isOnlineHost;
		if (
			!matchSync ||
			!isCoordinator ||
			onlineResumeSent ||
			(onlineSession && !onlineSession.isPlaying)
		) {
			return;
		}
		onlineResumeSent = true;
		clearOnlineCountdownTimer();
		const pendingHumans = sim.allPlayers.filter((p) => !p.isBot && p.pendingRacePick);
		for (const p of pendingHumans) {
			await matchSync.dispatch('SET_RACE', {
				team: p.team,
				playerSlot: p.slot,
				race: 'random'
			});
			// Space consecutive writes past the 80ms RTDB move cooldown
			await new Promise((resolveWait) => setTimeout(resolveWait, 90));
		}
		await matchSync.dispatch('RESUME', { tick: 0 });
	}

	function startOnlineCountdown() {
		clearOnlineCountdownTimer();
		matchPhase = 'COUNTDOWN';
		onlinePickedRace = null;
		onlineRacePickError = null;
		onlineResumeSent = false;
		countdownSeconds = onlineSession?.getCountdownRemainingSec() ?? 15;
		sim.isRunning = false;
		const fallbackStartMs = Date.now();
		const fallbackInitialSec = countdownSeconds;

		onlineCountdownTimer = setInterval(() => {
			if (!matchSync || matchPhase !== 'COUNTDOWN' || (onlineSession && !onlineSession.isPlaying)) {
				clearOnlineCountdownTimer();
				return;
			}
			const rem = onlineSession?.getCountdownRemainingSec();
			if (rem !== null && rem !== undefined) {
				countdownSeconds = rem;
			} else {
				const elapsedSec = Math.floor((Date.now() - fallbackStartMs) / 1000);
				countdownSeconds = Math.max(0, fallbackInitialSec - elapsedSec);
			}
			const allReady = !sim.allPlayers.some((p) => !p.isBot && p.pendingRacePick);
			if (allReady || countdownSeconds <= 0) {
				void finalizeOnlineCountdown();
			}
		}, 250);
	}

	function selectRaceAndStart(race: string) {
		if (matchSync) {
			if (
				(onlineSession && !onlineSession.isPlaying) ||
				!controlledPlayer.pendingRacePick ||
				onlinePickedRace !== null
			) {
				return;
			}
			onlinePickedRace = race;
			onlineRacePickError = null;
			sound.playUpgrade();
			void matchSync.dispatch('SET_RACE', {
				team: controlledPlayer.team,
				playerSlot: controlledPlayer.slot,
				race
			});
			return;
		}
		chosenWestRace = race;
		sound.playUpgrade();
		finishCountdownAndStartBattle();
	}

	function finishCountdownAndStartBattle() {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		const finalRace = chosenWestRace || 'Альянс';
		sim.setPlayerRace(controlledPlayer.team, finalRace);
		matchPhase = 'BATTLE';
		sim.isRunning = true;
		sound.playHorn();
		uiTick = sim.stateVersion;
	}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} onblur={clearHeldPanKeys} />

<main class="h-screen w-screen overflow-hidden relative bg-slate-950 select-none">
	<!-- Arena Viewport: Fullscreen Responsive with Pan & Zoom -->
	<div class="w-full h-full bg-[#090d16] flex items-center justify-center relative overflow-hidden">
		<canvas bind:this={canvasEl} class="w-full h-full block cursor-crosshair select-none"></canvas>

		<!-- Top Modular HUD Docks -->
		<TopBar
			{sim}
			{uiTick}
			isOnline={Boolean(matchSync)}
			isSpectator={isSpectatorView}
			{isRescueTargeting}
			activePlayer={controlledPlayer}
			onOpenForge={() => openExclusiveModal('forge')}
			onOpenCommander={() => openExclusiveModal('commander')}
			onOpenGuide={() => openExclusiveModal('guide')}
			onOpenShop={() => openExclusiveModal('shop')}
			onOpenSettings={openPauseMenu}
			onBeforeLeave={handleRequestLeave}
			onHoverCastleRange={(mode: 'short' | 'long' | null) =>
				renderer?.setHoveredCastleCannonMode(mode)}
			onStartRescueTargeting={() => activateRescueStrikeTargeting(false)}
		/>

		{#if !isSpectatorView && matchPhase === 'BATTLE'}
			{@const isEastSide = controlledPlayer.team === 'east'}
			{@const isWorkerSelected = selectedEntity?.type === 'worker'}
			{@const isCastleSelected =
				selectedEntity?.type === 'castle' && selectedEntity.team === controlledPlayer.team}
			<div
				data-testid="hud-quick-focus-dock"
				class="absolute top-1/2 -translate-y-1/2 {isEastSide
					? 'right-3'
					: 'left-3'} z-20 flex flex-col items-center gap-2 bg-[#131722]/90 backdrop-blur-md border-2 border-[#544738] rounded-2xl p-1.5 shadow-2xl pointer-events-auto"
			>
				<div class="relative group/tip">
					<button
						type="button"
						onclick={() => selectOwnWorker(true)}
						data-testid="hud-quick-worker-btn"
						aria-label="Знайти та обрати будівельника (Space)"
						class="w-14 h-14 rounded-xl border-2 flex items-center justify-center transition cursor-pointer shadow-md {isWorkerSelected
							? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/50'
							: 'bg-[#1a2030] hover:bg-[#232b40] border-slate-700 hover:border-amber-500/60 text-amber-300'}"
					>
						<UiIcon name="hammer" class="w-7 h-7" />
					</button>
					<div
						class="pointer-events-none absolute top-1/2 -translate-y-1/2 {isEastSide
							? 'right-full mr-2.5'
							: 'left-full ml-2.5'} z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 flex items-center gap-1.5"
					>
						<span>Будівельник</span>
						<span
							class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
						>
							Space
						</span>
					</div>
				</div>
				<div class="relative group/tip">
					<button
						type="button"
						onclick={() => selectOwnCastle(true)}
						data-testid="hud-quick-castle-btn"
						aria-label="Знайти та обрати замок (Enter)"
						class="w-14 h-14 rounded-xl border-2 flex items-center justify-center transition cursor-pointer shadow-md {isCastleSelected
							? 'bg-sky-500/25 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
							: 'bg-[#1a2030] hover:bg-[#232b40] border-slate-700 hover:border-sky-500/60 text-sky-300'}"
					>
						<UiIcon name="castle" class="w-7 h-7" />
					</button>
					<div
						class="pointer-events-none absolute top-1/2 -translate-y-1/2 {isEastSide
							? 'right-full mr-2.5'
							: 'left-full ml-2.5'} z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-sky-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 flex items-center gap-1.5"
					>
						<span>Замок</span>
						<span
							class="text-[9px] font-mono font-bold text-sky-400 bg-black/60 px-1 rounded border border-sky-500/40"
						>
							Enter
						</span>
					</div>
				</div>
			</div>
		{/if}

		{#if isBlinkTargeting && !isSpectatorView}
			<div
				data-testid="blink-targeting-banner"
				class="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/75 text-cyan-100 text-xs font-bold shadow-xl backdrop-blur-md"
			>
				<UiIcon name="zap" class="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
				<span>Оберіть точку на своєму острові для телепорту (макс. 500px)</span>
				<button
					type="button"
					onclick={() => (isBlinkTargeting = false)}
					class="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-[11px] text-slate-200 cursor-pointer"
				>
					{t('online.cancel')}
				</button>
			</div>
		{/if}

		{#if isRescueTargeting && !isSpectatorView}
			<div
				data-testid="rescue-targeting-banner"
				class="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-400/75 text-amber-100 text-xs font-bold shadow-xl backdrop-blur-md"
			>
				<UiIcon name="flame" class="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
				<span>{t('battle.rescueTargetingHint')}</span>
				<button
					type="button"
					onclick={() => (isRescueTargeting = false)}
					class="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-600 text-[11px] text-slate-200 cursor-pointer"
				>
					{t('online.cancel')}
				</button>
			</div>
		{/if}

		{#snippet playerSwitcherButtons()}
			{#each sim.allPlayers as botPlayer (botPlayer.slot ?? botPlayer.team)}
				{@const botSlot = botPlayer.slot ?? (botPlayer.team === 'east' ? 2 : 1)}
				{@const isActiveBot = controlledPlayer.slot === botSlot}
				<button
					type="button"
					onclick={() => selectBotControl(botSlot, isOnlineSpectator)}
					data-testid="bot-switch-btn-{botSlot}"
					class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold transition cursor-pointer touch-manipulation {isActiveBot
						? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
						: 'bg-[#181e2c] hover:bg-[#232b3e] border-[#3b3226] text-slate-300 hover:text-white'}"
					title="{botPlayer.name} ({formatRaceName(botPlayer.race)})"
				>
					<span
						class="w-2 h-2 rounded-full shrink-0"
						style="background-color: {botPlayer.color?.lightHex ??
							(botPlayer.team === 'west' ? '#3b82f6' : '#ef4444')};"
					></span>
					<span>{isOnlineSpectator ? botPlayer.name : `Бот ${botSlot}`}</span>
					<span class="text-[9px] text-slate-400 font-normal">
						({formatRaceName(botPlayer.race)})
					</span>
				</button>
			{/each}
		{/snippet}

		{#if isOnlineSpectator && matchPhase === 'BATTLE' && sim.allPlayers?.length > 0}
			<!-- Online Spectator Switcher & Vision Mode Dock -->
			<div
				data-testid="online-spectator-switcher"
				class="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#111520]/90 border border-[#544738] shadow-xl backdrop-blur-md"
			>
				<div
					class="flex items-center gap-1 pr-2 mr-1 border-r border-slate-700"
					data-testid="spectator-vision-switcher"
				>
					{#each [{ id: 'all' as const, label: t('online.spectator.visionAll') }, { id: 'west' as const, label: t('online.hud.teamWest') }, { id: 'east' as const, label: t('online.hud.teamEast') }] as vOpt (vOpt.id)}
						<button
							type="button"
							onclick={() => (spectatorVision = vOpt.id)}
							data-testid="spectator-vision-{vOpt.id}-btn"
							class="px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-pointer transition {spectatorVision ===
							vOpt.id
								? 'bg-sky-500/25 border-sky-400 text-sky-200'
								: 'bg-[#181e2c] hover:bg-[#232b3e] border-slate-700 text-slate-400'}"
						>
							{vOpt.label}
						</button>
					{/each}
				</div>
				{@render playerSwitcherButtons()}
			</div>
		{:else if isBotVsBot && matchPhase === 'BATTLE' && sim.allPlayers?.length > 0}
			<!-- Bot Switcher Pill Dock for Controlling Any Bot in Bot vs Bot Matches -->
			<div
				data-testid="spectator-bot-switcher"
				class="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#111520]/90 border border-[#544738] shadow-xl backdrop-blur-md"
			>
				{@render playerSwitcherButtons()}
			</div>
		{/if}

		{#if isReplayMode && replayData}
			{@const totalTicks = replayData.result?.totalTicks ?? sim.tick}
			<div
				data-testid="replay-player-bar"
				class="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111520]/95 border border-emerald-500/50 text-xs text-slate-100 shadow-xl backdrop-blur-md"
			>
				<span
					class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black uppercase text-[10px]"
				>
					{t('replay.playerBadge')}
				</span>
				<span class="font-mono text-amber-300 tabular-nums">
					{sim.tick} / {Math.max(sim.tick, totalTicks)}
				</span>
				<button
					type="button"
					onclick={() => {
						sim.isRunning = !sim.isRunning;
						sim.notifyStateChanged();
					}}
					class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold cursor-pointer"
				>
					{sim.isRunning ? 'Пауза' : 'Пуск'}
				</button>
				{#each [1, 2, 4] as sp (sp)}
					<button
						type="button"
						onclick={() => {
							sim.speed = sp;
							sim.notifyStateChanged();
						}}
						class="px-1.5 py-1 rounded font-mono font-bold cursor-pointer {sim.speed === sp
							? 'bg-amber-500 text-slate-950'
							: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
					>
						{sp}x
					</button>
				{/each}
				<button
					type="button"
					onclick={() => {
						allowNavigation = true;
						void goto(resolve('/account'));
					}}
					class="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-bold cursor-pointer"
				>
					{t('replay.exit')}
				</button>
			</div>
		{/if}

		{#if matchSync}
			{@const isDesyncNotice = Boolean(networkNotice?.includes('розсинхронізація'))}
			<div
				class="absolute {isOnlineSpectator
					? 'top-24'
					: 'top-16'} left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-md border {isDesyncNotice
					? 'pointer-events-auto bg-rose-950/90 border-rose-500/60 text-rose-200'
					: peerOnline
						? 'pointer-events-none bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
						: 'pointer-events-none bg-amber-950/80 border-amber-500/40 text-amber-300'}"
			>
				<span
					class="inline-block w-2 h-2 rounded-full {isDesyncNotice
						? 'bg-rose-400 animate-ping'
						: peerOnline
							? 'bg-emerald-400 animate-pulse'
							: 'bg-amber-400'}"
				></span>
				<span>
					{#if isDesyncNotice}
						{networkNotice}
					{:else if isOnlineSpectator}
						{t('online.spectator.badge')}{peerPingMs !== null ? ` · ${peerPingMs} мс` : ''}
					{:else if peerOnline}
						Онлайн PvP: {matchSync.localTeam === 'west' ? 'Захід (Ви)' : 'Схід (Ви)'} vs Суперник{peerPingMs !==
						null
							? ` · ${peerPingMs} мс`
							: ''}
					{:else}
						{networkNotice ?? 'Очікування суперника...'}
					{/if}
				</span>
				{#if isDesyncNotice}
					<button
						type="button"
						onclick={handleCopyDesyncLog}
						data-testid="copy-desync-log-btn"
						class="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/50 text-rose-100 transition-colors cursor-pointer"
					>
						{desyncLogCopied ? 'Скопійовано ✓' : 'Копіювати лог'}
					</button>
				{/if}
			</div>
		{/if}

		<!-- Pre-Match 15s Countdown & Race Selection Overlay -->
		{#if matchPhase === 'COUNTDOWN'}
			{@const humanPlayersList = sim.allPlayers.filter((p) => !p.isBot)}
			{@const pickedHumansCount = humanPlayersList.filter((p) => !p.pendingRacePick).length}
			{@const waitingForOthersOnline =
				Boolean(matchSync) &&
				(isOnlineSpectator || !controlledPlayer.pendingRacePick || onlinePickedRace !== null)}
			<div
				class="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4 select-none"
			>
				<div
					class="bg-[#121622] border-2 border-[#8c7456] rounded-3xl p-5 max-w-xl w-full text-center shadow-2xl space-y-3"
					style="box-shadow: 0 10px 40px rgba(0,0,0,0.9);"
				>
					{#if waitingForOthersOnline}
						<div class="py-4 px-2 space-y-3">
							<div
								class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border-2 border-amber-400/80 rounded-2xl animate-pulse"
							>
								<span class="text-2xl font-mono font-black text-amber-300">
									{countdownSeconds}
								</span>
								<span class="text-xs text-amber-200 font-bold uppercase">сек</span>
							</div>
							<div class="text-sm font-bold text-slate-100">
								{onlinePickedRace
									? 'Расу зафіксовано! Очікування інших гравців...'
									: 'Очікування гравців, які обирають расу в грі...'}
							</div>
							<div class="text-xs text-slate-400">
								Готові: <strong class="text-emerald-300 font-mono">
									{pickedHumansCount}/{Math.max(1, humanPlayersList.length)}
								</strong>
								· Раси приховані до початку бою
							</div>
						</div>
					{:else}
						{#if onlineRacePickError}
							<div
								class="px-3 py-2 rounded-xl bg-rose-950/90 border border-rose-500/50 text-xs text-rose-200 font-semibold"
							>
								{onlineRacePickError}
							</div>
						{/if}
						<!-- Top Button: Random Race (+30% Gold) with countdown timer -->
						<button
							type="button"
							onclick={() => selectRaceAndStart('random')}
							class="w-full py-2.5 px-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-lg bg-gradient-to-r from-purple-950/70 via-purple-900/50 to-[#181e2b] border-purple-500/60 hover:border-purple-400 hover:bg-purple-900/60 text-purple-200 active:scale-[0.99]"
						>
							<div class="flex items-center gap-2.5">
								<UiIcon name="dices" class="w-6 h-6 text-purple-300 shrink-0" />
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

						{#if matchSync && humanPlayersList.length > 1}
							<div class="text-[11px] text-slate-400">
								Готові: <span class="text-emerald-300 font-mono font-bold">
									{pickedHumansCount}/{humanPlayersList.length}
								</span> · Вибір суперника приховано
							</div>
						{/if}

						<!-- Race pick chips (Only the playable races) -->
						{@const availablePlayableCount = PLAYABLE_RACES.filter(
							(r) => !sim.isRaceBanned(r)
						).length}
						{@const teamScopedUr = sim.allPlayers.length > availablePlayableCount}
						<div class="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
							{#each RACES_LIST.filter( (r) => (PLAYABLE_RACES as readonly string[]).includes(r.race) ) as raceDef}
								{@const isBanned = sim.isRaceBanned(raceDef.race)}
								{@const isOpponentOccupied =
									sim.gameModeConfig.uniqueRaces &&
									sim.allPlayers.some(
										(p) =>
											p !== controlledPlayer &&
											!p.pendingRacePick &&
											(!teamScopedUr || p.team === controlledPlayer.team) &&
											formatRaceName(p.race) === formatRaceName(raceDef.race)
									)}
								{@const isDisabled = isBanned || isOpponentOccupied}
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
										: 'bg-[#181e2b] border-[#3b3226] hover:border-amber-400/80 hover:bg-[#202738] text-slate-200 hover:text-white cursor-pointer active:scale-95'}"
								>
									<span class="text-xs font-bold {isBanned ? 'line-through text-red-400/80' : ''}">
										{raceDef.race}
									</span>
									{#if isBanned}
										<span
											class="text-[9px] text-red-400 font-bold flex items-center justify-center gap-1"
										>
											<UiIcon name="circleSlash" class="w-3 h-3 text-red-400 shrink-0" />
											<span>Бан (-ban)</span>
										</span>
									{:else if isOpponentOccupied}
										<span class="text-[9px] text-amber-400/80 font-bold">Зайнято (-ur)</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Floating Bottom Bar: Buildings Grid, Tooltip, Portrait & Minimap HUD -->
		<BottomBar
			{sim}
			{uiTick}
			{cameraX}
			{cameraY}
			{zoom}
			{selectedEntity}
			{touchControls}
			localTeam={controlledPlayer.team}
			activePlayer={controlledPlayer}
			allowAllTeamsControl={isBotVsBot || isSpectatorView}
			isSpectator={isSpectatorView}
			selectedGroup={selectedEntity?.type === 'group' ? selectedEntity.unitIds : null}
			bind:selectedBuildingId
			bind:selectedPlacedBuildingId
			bind:selectedUnitId
			onSelectBuilding={(id: string | null) => {
				selectedBuildingId = id;
				if (id) {
					selectedPlacedBuildingId = null;
					selectedUnitId = null;
					selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
				}
			}}
			onUpgradeBuilding={handleUpgradeBuilding}
			onSellBuilding={handleSellBuilding}
			onContinueConstruction={handleContinueConstruction}
			onOpenCommander={() => (isCommanderOpen = true)}
			{isBlinkTargeting}
			onStartBlinkTargeting={() => activateBlinkTargeting()}
			onMinimapClick={(ax: number, ay: number) => renderer?.setCamera(ax, ay)}
			onHoverCastleRange={(mode: 'short' | 'long' | null) =>
				renderer?.setHoveredCastleCannonMode(mode)}
			onClearSelection={() => {
				selectedEntity = null;
				selectedBuildingId = null;
				selectedPlacedBuildingId = null;
				selectedUnitId = null;
				uiTick = sim.stateVersion;
			}}
		/>
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
				<UiIcon name="zoomIn" class="w-3.5 h-3.5" />
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
				<UiIcon name="zoomOut" class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => {
					const activeCastle = sim.castles[controlledPlayer.team];
					renderer?.setCamera(activeCastle.x, activeCastle.y);
				}}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Центрувати на замку"
				aria-label="Центрувати на замку"
				data-testid="arena-center-base"
			>
				<UiIcon name="compass" class="w-3.5 h-3.5" />
			</button>
			<button
				type="button"
				onclick={() => (isHelpOpen = true)}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] text-[#d4af37] flex items-center justify-center shadow transition active:scale-95 cursor-pointer touch-manipulation"
				title="Гарячі клавіші та довідка"
				aria-label="Гарячі клавіші"
				data-testid="arena-help-btn"
			>
				<UiIcon name="helpCircle" class="w-3.5 h-3.5" />
			</button>
		</div>
	{/snippet}

	<!-- Radial Action Menu (E / R / Q) -->
	<RadialMenu
		isOpen={isRadialOpen}
		category={radialCategory}
		{sim}
		localTeam={controlledPlayer.team}
		activePlayer={controlledPlayer}
		armyBuildings={getBaseBuildingsForRace(controlledPlayer.race).filter((b) => !b.specialType)}
		specialBuildings={getBaseBuildingsForRace(controlledPlayer.race).filter((b) =>
			Boolean(b.specialType)
		)}
		onSelectBuilding={(defId) => {
			selectedBuildingId = defId;
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
			isRadialOpen = false;
			uiTick = sim.stateVersion;
		}}
		onOpenShop={() => {
			isShopOpen = true;
		}}
		onOpenForge={() => {
			isForgeOpen = true;
		}}
		onStartRescueTargeting={() => activateRescueStrikeTargeting(false)}
		onClose={() => {
			isRadialOpen = false;
		}}
	/>

	<!-- Modals -->
	<ForgeModal
		{sim}
		{uiTick}
		localTeam={controlledPlayer.team}
		activePlayer={controlledPlayer}
		bind:isOpen={isForgeOpen}
		onBuildForge={() => {
			selectedBuildingId = 'cg11_forge';
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
			isForgeOpen = false;
			uiTick = sim.stateVersion;
		}}
		onUpgradeForge={(type) => {
			const activeP = controlledPlayer;
			const ok = dispatchCommand(
				'UPGRADE_FORGE',
				{ forgeType: type },
				() => sim.upgradeForge(activeP.team, type, activeP),
				() => sound.playForgeUpgrade()
			);
			if (!ok) {
				sound.playErrorResource();
			}
		}}
	/>
	<CommanderModal
		{sim}
		{uiTick}
		activePlayer={controlledPlayer}
		bind:isOpen={isCommanderOpen}
		onBuildCommanderHall={() => {
			selectedBuildingId = 'cg12_commander';
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
			isCommanderOpen = false;
			uiTick = sim.stateVersion;
		}}
		onSelectCommander={(choice) => {
			if (matchSync) {
				const check = sim.canSelectOrChangeCommander(controlledPlayer.team, controlledPlayer);
				if (!check.allowed) {
					sound.playErrorResource();
					return false;
				}
			}
			return dispatchCommand(
				'SELECT_COMMANDER',
				{ commanderId: choice },
				() => sim.selectPlayerCommander(controlledPlayer.team, choice, controlledPlayer).ok,
				() => sound.playUpgrade()
			);
		}}
	/>
	<ShopModal
		{sim}
		{uiTick}
		localTeam={controlledPlayer.team}
		activePlayer={controlledPlayer}
		bind:isOpen={isShopOpen}
		onBuildShop={() => {
			selectedBuildingId = 'cg10_shop';
			selectedPlacedBuildingId = null;
			selectedUnitId = null;
			selectedEntity = { type: 'worker', playerSlot: controlledPlayer.slot };
			isShopOpen = false;
			uiTick = sim.stateVersion;
		}}
		onBuyItem={(itemId) => {
			const activeP = controlledPlayer;
			const ok = dispatchCommand(
				'BUY_ITEM',
				{ itemId },
				() => sim.buyCastleItem(activeP.team, itemId, activeP),
				() => sound.playCoin()
			);
			if (!ok) {
				sound.playErrorResource();
			}
		}}
	/>
	<VictoryModal
		{sim}
		{uiTick}
		isOnline={Boolean(matchSync)}
		{isOnlineHost}
		earnedScore={lastEarnedScore}
		earnedXp={lastEarnedXp}
		serializedReplay={savedSerializedReplay}
		onNextRound={handleNextRound}
		onWatchReplay={() => {
			if (!savedSerializedReplay) return;
			const decoded = ReplaySerializer.deserialize(savedSerializedReplay);
			if (decoded.success && decoded.data) {
				startReplayPlayback(decoded.data);
			}
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
	<GuideModal bind:isOpen={isGuideOpen} />
	<A11yAnnouncer />
</main>
