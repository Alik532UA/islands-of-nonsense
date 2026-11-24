import { browser } from '$app/env';
import { toast } from '$lib/controllers/toast.svelte';
import { logService } from '$lib/services/logService.svelte';
import { t } from '$lib/i18n';

export function initServiceWorkerUpdate(): () => void {
	if (!browser || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return () => {};
	}

	let refreshing = false;
	const onControllerChange = () => {
		if (refreshing) return;
		refreshing = true;
		window.location.reload();
	};

	navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

	function promptUser(worker: ServiceWorker) {
		toast.info(t('pwa.updateAvailable') || 'Доступна нова версія гри', {
			duration: 0,
			action: {
				label: t('pwa.updateAction') || 'Оновити',
				run: () => {
					worker.postMessage({ type: 'SKIP_WAITING' });
				}
			}
		});
	}

	navigator.serviceWorker
		.getRegistration()
		.then((reg) => {
			if (!reg) return;

			if (reg.waiting) {
				promptUser(reg.waiting);
				return;
			}

			reg.addEventListener('updatefound', () => {
				const newWorker = reg.installing;
				if (!newWorker) return;

				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						promptUser(newWorker);
					}
				});
			});
		})
		.catch((error) => {
			logService.warn('pwa', 'ServiceWorker registration check failed', error);
		});

	return () => {
		navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
	};
}
