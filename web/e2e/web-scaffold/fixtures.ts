import type { BrowserContextOptions } from '@playwright/test';

export const origin = 'http://localhost:4173';
export const base = '/Rusticker';

/** A storage state with the saved locale preference (Paraglide's key). */
export function savedLocale(locale: string): BrowserContextOptions['storageState'] {
	return {
		cookies: [],
		origins: [{ origin, localStorage: [{ name: 'PARAGLIDE_LOCALE', value: locale }] }]
	};
}
