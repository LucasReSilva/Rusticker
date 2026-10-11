import { browser } from '$app/environment';
import { baseLocale, extractLocaleFromUrl, getLocale, type Locale } from '$lib/paraglide/runtime';

// Browser-only state. On the server a module-level value would be shared by
// every request (and every prerendered page), so the server always reads the
// request-scoped getLocale() instead.
let current = $state<Locale>(browser ? getLocale() : baseLocale);

/**
 * The active locale as reactive state (design D11). Components read
 * `locale.current` instead of calling `getLocale()`, so a locale switch
 * re-renders them.
 */
export const locale = {
	get current(): Locale {
		return browser ? current : getLocale();
	},
	set(value: Locale) {
		current = value;
	}
};

/** Updates the reactive locale from a URL (called after each navigation). */
export function syncLocaleFromUrl(url: URL): void {
	current = extractLocaleFromUrl(url) ?? baseLocale;
}
