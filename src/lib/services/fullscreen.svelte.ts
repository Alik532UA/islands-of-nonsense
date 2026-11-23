import { browser } from '$app/environment';

interface FullscreenDocument extends Document {
	webkitFullscreenElement?: Element;
	webkitFullscreenEnabled?: boolean;
	webkitExitFullscreen?: () => Promise<void> | undefined;
}

interface FullscreenHTMLElement extends HTMLElement {
	webkitRequestFullscreen?: () => Promise<void> | undefined;
}

export function canFullscreen(): boolean {
	if (!browser) return false;
	const doc = document as FullscreenDocument;
	return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isStandalone(): boolean {
	if (!browser) return false;
	const nav = navigator as Navigator & { standalone?: boolean };
	return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

class FullscreenState {
	active = $state(false);

	toggle(): void {
		if (!canFullscreen()) return;

		const doc = document as FullscreenDocument;
		const root = document.documentElement as FullscreenHTMLElement;

		if (doc.fullscreenElement || doc.webkitFullscreenElement) {
			const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
			void exit?.call(doc)?.catch(() => { });
			return;
		}

		const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
		void request?.call(root)?.catch(() => { });
	}

	watch(): () => void {
		if (!browser) return () => { };

		const sync = () => {
			const doc = document as FullscreenDocument;
			this.active = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
		};

		sync();
		document.addEventListener('fullscreenchange', sync);
		document.addEventListener('webkitfullscreenchange', sync);
		return () => {
			document.removeEventListener('fullscreenchange', sync);
			document.removeEventListener('webkitfullscreenchange', sync);
		};
	}
}

export const fullscreen = new FullscreenState();
