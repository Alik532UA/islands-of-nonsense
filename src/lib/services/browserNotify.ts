/**
 * Lightweight browser Notification API wrapper for match-found & invite alerts.
 */

export function canUseBrowserNotifications(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotifyPermission(): Promise<
	'granted' | 'denied' | 'default' | 'unsupported'
> {
	if (!canUseBrowserNotifications()) return 'unsupported';
	try {
		if (window.Notification.permission === 'granted') return 'granted';
		if (window.Notification.permission === 'denied') return 'denied';
		return await window.Notification.requestPermission();
	} catch {
		return 'denied';
	}
}

export function notifyIfHidden(title: string, body?: string): boolean {
	if (!canUseBrowserNotifications()) return false;
	if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
		return false;
	}
	if (window.Notification.permission !== 'granted') return false;
	try {
		new window.Notification(title, { body });
		return true;
	} catch {
		return false;
	}
}
