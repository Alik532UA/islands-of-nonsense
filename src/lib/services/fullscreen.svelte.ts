import { browser } from '$app/environment';

export const fullscreen = {
	get active(): boolean {
		if (!browser) return false;
		return Boolean(document.fullscreenElement);
	},
	toggle(): void {
		if (!browser) return;
		if (document.fullscreenElement) {
			void document.exitFullscreen().catch(() => {});
		} else {
			void document.documentElement.requestFullscreen().catch(() => {});
		}
	}
};

export function canFullscreen(): boolean {
	if (!browser) return false;
	return Boolean(document.fullscreenEnabled);
}
