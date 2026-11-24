import { logService } from '$lib/services/logService.svelte';

/** `beforeinstallprompt` — лише Chromium, у типах DOM його немає. */
interface InstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

type Stash = Window & { __pwaInstallPrompt?: InstallPromptEvent | null };

export const canPromptInstall = (): boolean => {
	if (typeof window === 'undefined') return false;
	return Boolean((window as Stash).__pwaInstallPrompt);
};

export async function promptInstall(): Promise<InstallOutcome> {
	if (typeof window === 'undefined') return 'unavailable';
	const stash = window as Stash;
	const event = stash.__pwaInstallPrompt;
	if (!event) return 'unavailable';
	stash.__pwaInstallPrompt = null;
	try {
		await event.prompt();
		return (await event.userChoice).outcome;
	} catch (error) {
		logService.warn('pwa', 'Install prompt failed', error);
		return 'unavailable';
	}
}
