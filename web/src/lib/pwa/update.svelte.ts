/// <reference types="vite-plugin-pwa/client" />
// Service-worker registration and the "update available" signal (design D2,
// D3). Updates use the `prompt` strategy: a new version installs in the
// background and waits until every app window is closed, so it never reloads
// a page on its own. A later change can show a toast that reads `needRefresh`
// and calls `applyUpdate()`.

let waiting = $state(false);
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

/** Whether a new version is installed and waiting (reactive). */
export const needRefresh = {
	get current(): boolean {
		return waiting;
	}
};

/** Registers the service worker. Browser-only; a no-op in dev. */
export async function registerServiceWorker(): Promise<void> {
	if (updateServiceWorker !== undefined) return;
	const { registerSW } = await import('virtual:pwa-register');
	updateServiceWorker = registerSW({
		immediate: true,
		onNeedRefresh() {
			waiting = true;
		}
	});
}

/** Activates the waiting version now and reloads the page (user-initiated). */
export async function applyUpdate(): Promise<void> {
	await updateServiceWorker?.(true);
}
