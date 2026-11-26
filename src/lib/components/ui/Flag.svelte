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
</script>

{#if norm}
	<span
		class="inline-flex items-center gap-1 shrink-0 align-middle"
		title={label}
		aria-label={label}
		role="img"
	>
		<span class="flg f-{norm} {size === 'md' ? 'w-[21px] h-[14px]' : 'w-[18px] h-3'}"></span>
		{#if showCode}
			<span
				class="text-[10px] px-1 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-300 font-mono uppercase leading-none"
			>
				{norm}
			</span>
		{/if}
	</span>
{/if}

<style>
	.flg {
		display: inline-block;
		box-sizing: border-box;
		border-radius: 2px;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
		overflow: hidden;
		flex-shrink: 0;
		background-color: #334155;
	}
	.f-ua {
		background: linear-gradient(180deg, #0057b7 50%, #ffd700 50%);
	}
	.f-pl {
		background: linear-gradient(180deg, #fff 50%, #dc143c 50%);
	}
	.f-cl {
		background: linear-gradient(180deg, #fff 50%, #d52b1e 50%);
	}
	.f-de {
		background: linear-gradient(180deg, #111 33%, #d00 33% 66%, #fc0 66%);
	}
	.f-nl {
		background: linear-gradient(180deg, #ae1c28 33%, #fff 33% 66%, #21468b 66%);
	}
	.f-bg {
		background: linear-gradient(180deg, #fff 33%, #00966e 33% 66%, #d62612 66%);
	}
	.f-hu {
		background: linear-gradient(180deg, #cd2a3e 33%, #fff 33% 66%, #436f4d 66%);
	}
	.f-at {
		background: linear-gradient(180deg, #ed2939 33%, #fff 33% 66%, #ed2939 66%);
	}
	.f-ee {
		background: linear-gradient(180deg, #0072ce 33%, #111 33% 66%, #fff 66%);
	}
	.f-lt {
		background: linear-gradient(180deg, #fdb913 33%, #006a44 33% 66%, #c1272d 66%);
	}
	.f-ar {
		background: linear-gradient(180deg, #74acdf 33%, #fff 33% 66%, #74acdf 66%);
	}
	.f-hr {
		background: linear-gradient(180deg, #f00 33%, #fff 33% 66%, #171796 66%);
	}
	.f-sk {
		background: linear-gradient(180deg, #fff 33%, #0b4ea2 33% 66%, #ee1c25 66%);
	}
	.f-fr {
		background: linear-gradient(90deg, #0055a4 33%, #fff 33% 66%, #ef4135 66%);
	}
	.f-it {
		background: linear-gradient(90deg, #009246 33%, #fff 33% 66%, #ce2b37 66%);
	}
	.f-be {
		background: linear-gradient(90deg, #111 33%, #fdda24 33% 66%, #ef3340 66%);
	}
	.f-ro {
		background: linear-gradient(90deg, #002b7f 33%, #fcd116 33% 66%, #ce1126 66%);
	}
	.f-ie {
		background: linear-gradient(90deg, #169b62 33%, #fff 33% 66%, #ff883e 66%);
	}
	.f-mx {
		background: linear-gradient(90deg, #006847 33%, #fff 33% 66%, #ce1126 66%);
	}
	.f-pt {
		background: linear-gradient(90deg, #060 40%, #f00 40%);
	}
	.f-lv {
		background: linear-gradient(180deg, #9e3039 40%, #fff 40% 60%, #9e3039 60%);
	}
	.f-es {
		background: linear-gradient(180deg, #aa151b 25%, #f1bf00 25% 75%, #aa151b 75%);
	}
	.f-il {
		background: linear-gradient(180deg, #0038b8 18%, #fff 18% 82%, #0038b8 82%);
	}
	.f-gr {
		background: repeating-linear-gradient(180deg, #0d5eaf 0 18%, #fff 18% 36%);
	}
	.f-jp {
		background: radial-gradient(circle, #bc002d 30%, #fff 32%);
	}
	.f-kr {
		background: radial-gradient(circle, #cd2e3a 30%, #fff 32%);
	}
	.f-tr,
	.f-sg {
		background: radial-gradient(circle, #fff 24%, #e30a17 26%);
	}
	.f-br {
		background: radial-gradient(circle, #ffdf00 32%, #009c3b 34%);
	}
	.f-se {
		background:
			linear-gradient(180deg, transparent 38%, #fecc00 38% 62%, transparent 62%),
			linear-gradient(90deg, #006aa7 28%, #fecc00 28% 44%, #006aa7 44%);
	}
	.f-fi {
		background:
			linear-gradient(180deg, transparent 38%, #003580 38% 62%, transparent 62%),
			linear-gradient(90deg, #fff 28%, #003580 28% 44%, #fff 44%);
	}
	.f-dk {
		background:
			linear-gradient(180deg, transparent 38%, #fff 38% 62%, transparent 62%),
			linear-gradient(90deg, #c60c30 28%, #fff 28% 44%, #c60c30 44%);
	}
	.f-no {
		background:
			linear-gradient(180deg, transparent 42%, #00205b 42% 58%, transparent 58%),
			linear-gradient(90deg, transparent 31%, #00205b 31% 41%, transparent 41%),
			linear-gradient(180deg, transparent 38%, #fff 38% 62%, transparent 62%),
			linear-gradient(90deg, #ba0c2f 28%, #fff 28% 44%, #ba0c2f 44%);
	}
	.f-ch {
		background:
			linear-gradient(180deg, #d52b1e 20%, transparent 20% 80%, #d52b1e 80%),
			linear-gradient(90deg, #d52b1e 39%, #fff 39% 61%, #d52b1e 61%),
			linear-gradient(180deg, #d52b1e 36%, #fff 36% 64%, #d52b1e 64%);
	}
	.f-ca {
		background:
			radial-gradient(circle, #d80621 24%, transparent 26%),
			linear-gradient(90deg, #d80621 25%, #fff 25% 75%, #d80621 75%);
	}
	.f-cz {
		background:
			linear-gradient(135deg, #11457e 38%, transparent 38%),
			linear-gradient(45deg, #11457e 38%, transparent 38%),
			linear-gradient(180deg, #fff 50%, #d7141a 50%);
	}
	.f-us {
		background:
			linear-gradient(135deg, #3c3b6e 42%, transparent 42%),
			repeating-linear-gradient(180deg, #b22234 0 16%, #fff 16% 32%);
	}
	.f-gb {
		background:
			linear-gradient(180deg, transparent 38%, #c8102e 38% 62%, transparent 62%),
			linear-gradient(90deg, transparent 41%, #c8102e 41% 59%, transparent 59%),
			linear-gradient(180deg, transparent 32%, #fff 32% 68%, transparent 68%),
			linear-gradient(90deg, transparent 36%, #fff 36% 64%, transparent 64%), #012169;
	}
	.f-au,
	.f-nz {
		background: linear-gradient(135deg, #c8102e 26%, #012169 27%);
	}
</style>
