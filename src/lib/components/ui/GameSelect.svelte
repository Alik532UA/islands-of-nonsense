<script lang="ts">
	import UiIcon from './UiIcon.svelte';

	export interface GameSelectOption {
		value: string;
		label: string;
		colorHex?: string;
	}

	let {
		value = $bindable(''),
		options,
		onchange,
		ariaLabel,
		testId,
		id,
		align = 'left',
		minMenuWidth = 176,
		buttonClass = ''
	}: {
		value?: string;
		options: GameSelectOption[];
		onchange?: (nextValue: string) => void;
		ariaLabel?: string;
		testId?: string;
		id?: string;
		align?: 'left' | 'right';
		minMenuWidth?: number;
		buttonClass?: string;
	} = $props();

	let isOpen = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuStyle = $state('');

	const selectedOption = $derived(options.find((opt) => opt.value === value) ?? options[0]);

	function computeMenuPosition() {
		if (!triggerEl || typeof window === 'undefined') return;
		const rect = triggerEl.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 10;
		const spaceBelow = Math.max(120, vh - rect.bottom - pad);
		const spaceAbove = Math.max(120, rect.top - pad);
		const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
		const maxH = openUp ? spaceAbove : spaceBelow;
		const minW = Math.max(rect.width, minMenuWidth);

		const parts: string[] = [
			`max-height: ${Math.floor(maxH)}px`,
			`min-width: ${Math.round(minW)}px`
		];

		if (openUp) {
			parts.push(`bottom: ${Math.round(vh - rect.top + 6)}px`);
		} else {
			parts.push(`top: ${Math.round(rect.bottom + 6)}px`);
		}

		const shouldAlignRight = align === 'right' || rect.left + minW > vw - pad;
		if (shouldAlignRight) {
			parts.push(`right: ${Math.max(pad, Math.round(vw - rect.right))}px`);
		} else {
			parts.push(`left: ${Math.max(pad, Math.round(rect.left))}px`);
		}

		menuStyle = parts.join('; ');
	}

	function toggleMenu() {
		if (isOpen) {
			isOpen = false;
			return;
		}
		computeMenuPosition();
		isOpen = true;
	}

	function pickOption(nextVal: string) {
		value = nextVal;
		isOpen = false;
		onchange?.(nextVal);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			e.stopPropagation();
			isOpen = false;
			triggerEl?.focus();
		}
	}

	function portal(node: HTMLElement) {
		if (typeof document !== 'undefined') {
			document.body.appendChild(node);
		}
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}
</script>

<svelte:window onkeydown={handleKeyDown} onresize={() => isOpen && computeMenuPosition()} />

<div class="relative inline-block">
	<button
		bind:this={triggerEl}
		{id}
		type="button"
		onclick={toggleMenu}
		aria-label={ariaLabel && selectedOption?.label
			? `${ariaLabel}: ${selectedOption.label}`
			: ariaLabel}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		data-testid={testId}
		class="flex items-center justify-between gap-2 rounded-lg border border-[#544738] hover:border-amber-500/75 bg-[#181d28] hover:bg-[#242c3d] text-xs font-semibold text-amber-200 cursor-pointer transition px-2.5 py-1 shadow-inner {buttonClass}"
	>
		<span class="flex items-center gap-1.5 min-w-0 truncate">
			{#if selectedOption?.colorHex}
				<span
					class="w-3 h-3 rounded-full border border-white/40 shrink-0"
					style="background-color: {selectedOption.colorHex};"
				></span>
			{/if}
			<span class="truncate">{selectedOption?.label ?? ''}</span>
		</span>
		<UiIcon
			name="chevronDown"
			class="w-3.5 h-3.5 text-amber-300/80 shrink-0 transition-transform duration-150 {isOpen
				? 'rotate-180'
				: ''}"
		/>
	</button>

	{#if isOpen}
		<div use:portal class="contents">
			<button
				type="button"
				class="fixed inset-0 z-[9998] cursor-default bg-transparent"
				onclick={() => (isOpen = false)}
				aria-label="Закрити список"
				tabindex="-1"
			></button>
			<div
				role="listbox"
				aria-label={ariaLabel && selectedOption?.label
					? `${ariaLabel}: ${selectedOption.label}`
					: ariaLabel}
				style={menuStyle}
				class="fixed z-[9999] rounded-xl border border-[#8c7456]/85 bg-[#131722]/98 backdrop-blur-md p-1.5 shadow-2xl overflow-y-auto flex flex-col gap-0.5 text-slate-100"
			>
				{#each options as opt (opt.value)}
					{@const isSelected = opt.value === value}
					<button
						type="button"
						role="option"
						aria-selected={isSelected}
						onclick={() => pickOption(opt.value)}
						class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition text-left {isSelected
							? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
							: 'text-slate-200 hover:bg-[#242c3d] hover:text-amber-100 border border-transparent'}"
					>
						<span class="flex items-center gap-2 min-w-0 truncate">
							{#if opt.colorHex}
								<span
									class="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
									style="background-color: {opt.colorHex};"
								></span>
							{/if}
							<span class="truncate">{opt.label}</span>
						</span>
						{#if isSelected}
							<UiIcon name="check" class="w-3.5 h-3.5 text-amber-300 shrink-0" />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
