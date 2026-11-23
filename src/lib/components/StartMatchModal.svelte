<script lang="ts">
	import type { SimulationConfig } from '../engine/simulation';
	import MatchConfigModal from './MatchConfigModal.svelte';

	let {
		isOpen = false,
		currentConfig,
		onClose,
		onStartMatch
	}: {
		isOpen: boolean;
		currentConfig?: Partial<SimulationConfig>;
		onClose: () => void;
		onStartMatch: (config: SimulationConfig) => void;
	} = $props();
</script>

<MatchConfigModal {isOpen} {currentConfig} {onClose} {onStartMatch} />
