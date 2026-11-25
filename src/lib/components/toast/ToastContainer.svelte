<script lang="ts">
	import { toast, type ToastItem } from '$lib/controllers/toast.svelte';
	import UiIcon, { type UiIconName } from '$lib/components/ui/UiIcon.svelte';

	function getBorderAndIcon(type: ToastItem['type']) {
		switch (type) {
			case 'success':
				return {
					border: 'border-emerald-500/50 bg-slate-900/95 text-emerald-300',
					icon: 'checkCircle2' as UiIconName,
					iconClass: 'text-emerald-400',
					progressClass: 'bg-emerald-400'
				};
			case 'error':
				return {
					border: 'border-red-500/50 bg-slate-900/95 text-red-300',
					icon: 'alertCircle' as UiIconName,
					iconClass: 'text-red-400',
					progressClass: 'bg-red-400'
				};
			case 'warn':
				return {
					border: 'border-amber-500/50 bg-slate-900/95 text-amber-300',
					icon: 'alertTriangle' as UiIconName,
					iconClass: 'text-amber-400',
					progressClass: 'bg-amber-400'
				};
			case 'info':
			default:
				return {
					border: 'border-cyan-500/50 bg-slate-900/95 text-cyan-300',
					icon: 'info' as UiIconName,
					iconClass: 'text-cyan-400',
					progressClass: 'bg-cyan-400'
				};
		}
	}

	function progressAction(node: HTMLElement, item: ToastItem) {
		if (typeof node.animate !== 'function' || item.duration <= 0) return;
		const animation = node.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
			duration: item.duration,
			fill: 'forwards',
			easing: 'linear'
		});
		animation.currentTime = toast.elapsed(item.id);
		if (item.paused) {
			animation.pause();
		}

		return {
			update(newItem: ToastItem) {
				if (newItem.paused) {
					animation.pause();
				} else {
					animation.play();
				}
			},
			destroy() {
				animation.cancel();
			}
		};
	}
</script>

<!-- Toast notification layer (NOTIFICATIONS.md) -->
{#if toast.items.length > 0}
	<div
		class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 md:px-0"
		aria-live="polite"
	>
		{#each toast.items as item (item.id)}
			{@const styling = getBorderAndIcon(item.type)}
			<div
				class="pointer-events-auto rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all flex items-start gap-3 relative overflow-hidden {styling.border}"
				role={item.urgent ? 'alert' : 'status'}
				onmouseenter={() => toast.pause(item.id)}
				onmouseleave={() => toast.resume(item.id)}
				onfocusin={() => toast.pause(item.id)}
				onfocusout={() => toast.resume(item.id)}
			>
				<UiIcon name={styling.icon} class="w-5 h-5 shrink-0 mt-0.5 {styling.iconClass}" />
				<div class="flex-1 min-w-0 pr-2">
					<p class="text-sm font-medium text-slate-100 leading-snug break-words">
						{item.message}
					</p>
					{#if item.action}
						<button
							type="button"
							class="mt-2 text-xs font-semibold underline hover:text-white cursor-pointer"
							onclick={() => {
								item.action?.run();
								toast.dismiss(item.id);
							}}
						>
							{item.action.label}
						</button>
					{/if}
				</div>
				<button
					type="button"
					class="text-slate-400 hover:text-slate-100 p-1 -mr-1 -mt-1 rounded-lg transition cursor-pointer"
					aria-label="Закрити сповіщення"
					onclick={() => toast.dismiss(item.id)}
				>
					<UiIcon name="x" class="w-4 h-4" />
				</button>

				{#if item.duration > 0}
					<div
						class="toast-progress absolute bottom-0 left-0 right-0 h-[3px] origin-left pointer-events-none {styling.progressClass}"
						data-testid="toast-{item.id}-progress"
						aria-hidden="true"
						use:progressAction={item}
					></div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
