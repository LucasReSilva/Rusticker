import { isLocale, localStorageKey, type Locale } from '$lib/paraglide/runtime';

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The browser's local storage; throws where storage is blocked. */
function browserStorage(): LocaleStorage {
	return globalThis.localStorage;
}

/**
 * The locale the user explicitly chose, if any. It is stored only on the
 * device, under Paraglide's key. Blocked storage and unsupported values count
 * as "no preference".
 */
export function readSavedLocale(
	storage: () => LocaleStorage = browserStorage
): Locale | undefined {
	try {
		const value = storage().getItem(localStorageKey);
		return value !== null && isLocale(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

/** Saves the user's explicit locale choice; blocked storage is ignored. */
export function saveLocalePreference(
	locale: Locale,
	storage: () => LocaleStorage = browserStorage
): void {
	try {
		storage().setItem(localStorageKey, locale);
	} catch {
		// Storage unavailable: the choice still applies to this visit.
	}
}
