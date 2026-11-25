<script lang="ts">
	import { countryName, isCountry } from '$lib/config/countries';
	import { settings } from '$lib/services/settings.svelte';

	interface Props {
		code: string | null | undefined;
		size?: 'sm' | 'md';
		showCode?: boolean;
	}

	let { code, size = 'sm', showCode = false }: Props = $props();

	const norm = $derived(isCountry(code) ? String(code).toLowerCase() : null);
	const label = $derived(norm ? countryName(norm, settings.locale) : '');

	// CSS stripe specs: "angle,stops" (90 = vertical, 180 = horizontal)
	const STRIPES: Record<string, string> = {
		ua: '180,#0057b7 50%,#ffd700 50%',
		pl: '180,#ffffff 50%,#dc143c 50%',
		de: '180,#111111 33%,#dd0000 33% 66%,#ffce00 66%',
		fr: '90,#0055a4 33%,#ffffff 33% 66%,#ef4135 66%',
		it: '90,#009246 33%,#ffffff 33% 66%,#ce2b37 66%',
		nl: '180,#ae1c28 33%,#ffffff 33% 66%,#21468b 66%',
		be: '90,#111111 33%,#fdda24 33% 66%,#ef3340 66%',
		ro: '90,#002b7f 33%,#fcd116 33% 66%,#ce1126 66%',
		ie: '90,#169b62 33%,#ffffff 33% 66%,#ff883e 66%',
		bg: '180,#ffffff 33%,#00966e 33% 66%,#d62612 66%',
		hu: '180,#cd2a3e 33%,#ffffff 33% 66%,#436f4d 66%',
		at: '180,#ed2939 33%,#ffffff 33% 66%,#ed2939 66%',
		ee: '180,#0072ce 33%,#111111 33% 66%,#ffffff 66%',
		lv: '180,#9e3039 40%,#ffffff 40% 60%,#9e3039 60%',
		lt: '180,#fdb913 33%,#006a44 33% 66%,#c1272d 66%',
		es: '180,#aa151b 25%,#f1bf00 25% 75%,#aa151b 75%',
		pt: '90,#006600 40%,#ff0000 40%',
		ar: '180,#74acdf 33%,#ffffff 33% 66%,#74acdf 66%',
		mx: '90,#006847 33%,#ffffff 33% 66%,#ce1126 66%',
		hr: '180,#ff0000 33%,#ffffff 33% 66%,#171796 66%',
		sk: '180,#ffffff 33%,#0b4ea2 33% 66%,#ee1c25 66%'
	};

	const CROSSES: Record<string, [string, string, string?]> = {
		se: ['#006aa7', '#fecc00'],
		fi: ['#ffffff', '#003580'],
		dk: ['#c60c30', '#ffffff'],
		no: ['#ba0c2f', '#ffffff', '#00205b']
	};
</script>

{#if norm}
	{@const stripe = STRIPES[norm]}
	{@const cross = CROSSES[norm]}
	<span
		class="inline-flex items-center gap-1 shrink-0 align-middle"
		title={label}
		aria-label={label}
		role="img"
	>
		{#if stripe}
			<span
				class="inline-block rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				style="background: linear-gradient({stripe.replace(',', 'deg, ')});"
			></span>
		{:else if cross}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill={cross[0]} />
				<rect x="5" width="3" height="12" fill={cross[1]} />
				<rect y="4.5" width="18" height="3" fill={cross[1]} />
				{#if cross[2]}
					<rect x="5.7" width="1.6" height="12" fill={cross[2]} />
					<rect y="5.2" width="18" height="1.6" fill={cross[2]} />
				{/if}
			</svg>
		{:else if norm === 'us'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill="#ffffff" />
				<path d="M0 0h18v2H0zm0 4h18v2H0zm0 4h18v2H0zm0 4h18v1H0z" fill="#b22234" />
				<rect width="8" height="6" fill="#3c3b6e" />
			</svg>
		{:else if norm === 'gb' || norm === 'au' || norm === 'nz'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill="#012169" />
				<path d="M0 0l18 12M18 0L0 12" stroke="#ffffff" stroke-width="2" />
				<path d="M9 0v12M0 6h18" stroke="#ffffff" stroke-width="3.2" />
				<path d="M9 0v12M0 6h18" stroke="#c8102e" stroke-width="1.8" />
			</svg>
		{:else if norm === 'jp' || norm === 'kr'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill="#ffffff" />
				<circle cx="9" cy="6" r="3" fill={norm === 'jp' ? '#bc002d' : '#cd2e3a'} />
			</svg>
		{:else if norm === 'ch'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill="#d52b1e" />
				<path d="M7.8 2.5h2.4v7H7.8zM5.5 4.8h7v2.4h-7z" fill="#ffffff" />
			</svg>
		{:else if norm === 'ca'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill="#ffffff" />
				<rect width="4.5" height="12" fill="#d80621" />
				<rect x="13.5" width="4.5" height="12" fill="#d80621" />
				<circle cx="9" cy="6" r="2.2" fill="#d80621" />
			</svg>
		{:else if norm === 'cz'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="6" fill="#ffffff" />
				<rect y="6" width="18" height="6" fill="#d7141a" />
				<polygon points="0,0 8.5,6 0,12" fill="#11457e" />
			</svg>
		{:else if norm === 'tr' || norm === 'br' || norm === 'il' || norm === 'gr' || norm === 'sg' || norm === 'cl'}
			{@const bg =
				norm === 'tr' || norm === 'sg'
					? '#e30a17'
					: norm === 'br'
						? '#009c3b'
						: norm === 'gr'
							? '#0d5eaf'
							: '#0038b8'}
			<svg
				viewBox="0 0 18 12"
				class="rounded-[2px] border border-white/25 shrink-0 {size === 'md'
					? 'w-[21px] h-[14px]'
					: 'w-[18px] h-3'}"
				aria-hidden="true"
			>
				<rect width="18" height="12" fill={bg} />
				<circle
					cx="9"
					cy="6"
					r="2.6"
					fill={norm === 'br' ? '#ffdf00' : '#ffffff'}
					opacity="0.9"
				/>
			</svg>
		{/if}
		{#if showCode}
			<span
				class="text-[10px] px-1 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-300 font-mono uppercase leading-none"
			>
				{norm}
			</span>
		{/if}
	</span>
{/if}
