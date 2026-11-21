<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Simulation, type SimulationConfig } from '../lib/engine/simulation';
	import { BotAI } from '../lib/engine/botAI';
	import { ArenaRenderer } from '../lib/renderer/ArenaRenderer';
	import { sound } from '../lib/services/audio';
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
	let isForgeOpen = $state(false);
	let isCommanderOpen = $state(false);
	let isShopOpen = $state(false);
	let isSettingsOpen = $state(false);

	let animFrameId: number;

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			selectedBuildingId = null;
			selectedPlacedBuildingId = null;
			isForgeOpen = false;
			isCommanderOpen = false;
			isShopOpen = false;
			isSettingsOpen = false;
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
			uiTick = sim.stateVersion;
		}
	}

	onMount(async () => {
		renderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			onTileClick: (tileX: number, tileY: number) => {
				if (selectedBuildingId) {
					const success = sim.build('west', selectedBuildingId, tileX, tileY);
					if (success) {
						sound.playBuild();
						selectedBuildingId = null;
						selectedPlacedBuildingId = null;
						uiTick = sim.stateVersion;
					}
				} else {
					const existing = sim.buildings.find(
						(b) => b.team === 'west' && b.tileX === tileX && b.tileY === tileY
					);
					selectedPlacedBuildingId = existing ? existing.instanceId : null;
					uiTick = sim.stateVersion;
				}
			},
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
		sim = new Simulation(newConfig);
		botAI = new BotAI(sim);
		renderer?.setSimulation(sim);
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

	<!-- Arena Viewport (Longer Map aspect 3:1) -->
	<div
		class="flex-1 w-full bg-slate-950 flex items-center justify-center p-2 relative overflow-hidden"
	>
		<canvas
			bind:this={canvasEl}
			class="max-w-full max-h-full rounded-xl shadow-2xl border border-slate-800 object-contain aspect-[3/1] cursor-crosshair"
		></canvas>
	</div>

	<!-- Bottom Bar: Buildings Grid 4x3, Tooltip, Race & Lane Selectors -->
	<BottomBar
		{sim}
		{uiTick}
		bind:selectedBuildingId
		bind:selectedPlacedBuildingId
		onSelectBuilding={(id: string | null) => {
			selectedBuildingId = id;
			if (id) selectedPlacedBuildingId = null;
		}}
		onUpgradeBuilding={handleUpgradeBuilding}
		onSellBuilding={handleSellBuilding}
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
