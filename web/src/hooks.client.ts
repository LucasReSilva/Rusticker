import type { ClientInit } from '@sveltejs/kit';
import { entryRedirect } from '$lib/i18n/entry-redirect';
import { basePath } from '$lib/i18n/links';
import { readSavedLocale } from '$lib/i18n/preference';

/**
 * Runs once per document load, before hydration. An unprefixed URL moves to
 * the saved or browser locale (design D5). In-app navigations never get here.
 */
export const init: ClientInit = async () => {
	const target = entryRedirect(
		new URL(location.href),
		basePath(),
		readSavedLocale(),
		navigator.languages ?? []
	);
	if (target !== undefined) {
		location.replace(target);
		// The document is being replaced: do not hydrate the old one.
		await new Promise<never>(() => {});
	}

	// Test-only hook for the e2e suite (there is no language switcher UI yet).
	// Vite replaces the flag at build time, so normal builds drop this block.
	if (import.meta.env.VITE_E2E_HOOKS === 'true') {
		const { switchLocale } = await import('$lib/i18n/switch');
		Object.assign(window, { __rusticker_e2e: { switchLocale } });
	}
};
