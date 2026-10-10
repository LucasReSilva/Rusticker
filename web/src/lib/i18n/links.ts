import { resolve } from '$app/paths';
import { getLocale, type Locale } from '$lib/paraglide/runtime';
import { pages, type PageId } from './routes.js';

// `resolve` is typed for route IDs; localized slugs are plain pathnames that
// `reroute` maps to the English route directories.
const resolvePathname = resolve as unknown as (pathname: string) => string;

/**
 * The URL of a page in a locale (the active one by default), including the
 * base path. It reads the route table directly, so links are predictable.
 */
export function localizedPath(page: PageId, locale: Locale = getLocale()): string {
	return resolvePathname(pages[page][locale]);
}
