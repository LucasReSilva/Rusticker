import type { Locale } from '$lib/paraglide/runtime';
import { localePrefix, pages, parseLocalizedPath } from './routes.js';

/**
 * Strips the base path from a pathname, or returns `undefined` when the
 * pathname lies outside the app.
 */
export function stripBase(pathname: string, base: string): string | undefined {
	if (base === '') return pathname;
	if (pathname === base) return '/';
	return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : undefined;
}

/**
 * The URL of the current page in another locale, keeping the query string and
 * the hash. A known page maps to its translated slug; an unknown path keeps
 * its rest under the target locale's prefix (and then renders the localized
 * not-found page).
 */
export function localizeCurrentUrl(url: URL, locale: Locale, base: string): string {
	const path = stripBase(url.pathname, base) ?? url.pathname;
	const { page, rest } = parseLocalizedPath(path);
	const target = page ? pages[page][locale] : localePrefix(locale) + rest;
	return base + target + url.search + url.hash;
}
