<script lang="ts">
	import { Eye, EyeOff } from 'lucide-svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	interface Props {
		value?: string;
		placeholder?: string;
		testId?: string;
		name?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		id?: string;
		disabled?: boolean;
		required?: boolean;
		minlength?: number;
		class?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Пароль',
		testId = 'input-auth-password',
		name = 'password',
		autocomplete = 'current-password',
		id = 'auth-password-input',
		disabled = false,
		required = false,
		minlength = undefined,
		class: className = ''
	}: Props = $props();

	let visible = $state(false);
	let capsLock = $state(false);
	let focused = $state(false);

	const showCapsWarning = $derived(focused && capsLock);

	function readCaps(event: KeyboardEvent | MouseEvent) {
		capsLock = event.getModifierState('CapsLock');
	}
</script>

<div class="relative w-full">
	<div class="relative flex items-center">
		<input
			{id}
			data-testid={testId}
			{name}
			{placeholder}
			{autocomplete}
			{disabled}
			{required}
			{minlength}
			type={visible ? 'text' : 'password'}
			bind:value
			autocapitalize="none"
			autocorrect="off"
			spellcheck="false"
			class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50 {className}"
			onkeydown={readCaps}
			onkeyup={readCaps}
			onmousedown={readCaps}
			onfocus={() => {
				focused = true;
			}}
			onblur={() => {
				focused = false;
				capsLock = false;
			}}
		/>

		<button
			type="button"
			class="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
			data-testid="{testId}-reveal-btn"
			aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
			aria-pressed={visible}
			tabindex="-1"
			onclick={() => (visible = !visible)}
		>
			{#if visible}
				<EyeOff class="w-4 h-4" />
			{:else}
				<Eye class="w-4 h-4" />
			{/if}
		</button>
	</div>

	{#if showCapsWarning}
		<div
			class="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-400"
			data-testid="{testId}-caps-warning"
			role="status"
		>
			<UiIcon name="alertTriangle" class="w-3.5 h-3.5 shrink-0" />
			<span>CapsLock увімкнено</span>
		</div>
	{/if}
</div>
