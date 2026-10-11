// Localized URL helpers for SEO and install metadata (design D6). The slugs
// come from the shared route table (src/lib/i18n/routes.js), which also builds
// Paraglide's URL patterns; the locale list comes from Paraglide's runtime, so
// a new locale needs no change here.
import { baseLocale, locales, type Locale } from '$lib/paraglide/runtime';
import { pageIds, pages, parseLocalizedPath, type PageId } from '$lib/i18n/routes.js';
import { SITE_URL } from './site';

/** The public pages, as base-locale paths (`/`, `/como-usar`, `/sobre`). */
export const PUBLIC_PAGES: readonly string[] = pageIds.map((id) => pages[id][baseLocale]);

export type Alternate = { hreflang: Locale | 'x-default'; href: string };

/** The page shown at a base-locale path, or `undefined` if it is not public. */
function pageOf(path: string): PageId | undefined {
	return pageIds.find((id) => pages[id][baseLocale] === path);
}

/**
 * The base-relative path of a public page in a locale, e.g.
 * `localizedPath('/sobre', 'en')` is `/en/about`. Tool URLs keep their
 * trailing slash (`/en/`); content pages have none.
 */
export function localizedPath(path: string, locale: Locale): string {
	const id = pageOf(path);
	if (id === undefined) throw new Error(`Not a public page: ${path}`);
	return pages[id][locale];
}

/**
 * The public page (as its base-locale path) and locale of a base-relative
 * pathname, or `undefined` when the pathname is not a public page URL.
 */
export function pageFromPath(pathname: string): { page: string; locale: Locale } | undefined {
	const { locale, page } = parseLocalizedPath(pathname);
	if (page === undefined) return undefined;
	const canonical = pages[page][locale];
	// `/en` is served as `/en/`; any other spelling is not a page URL.
	if (pathname !== canonical && pathname !== canonical.replace(/\/$/, '')) return undefined;
	return { page: pages[page][baseLocale], locale };
}

/** Like {@link pageFromPath}, for a full URL under the given base path. */
export function pageFromUrl(url: URL, base: string): { page: string; locale: Locale } | undefined {
	const { pathname } = url;
	if (base !== '' && pathname !== base && !pathname.startsWith(`${base}/`)) return undefined;
	return pageFromPath(pathname.slice(base.length) || '/');
}

/**
 * The absolute URL of a base-relative path. `siteUrl` already contains the
 * base path, so it appears exactly once.
 */
export function absoluteUrl(path: string, siteUrl: string = SITE_URL): string {
	return `${siteUrl.replace(/\/+$/, '')}${path}`;
}

/**
 * The language alternates of a public page: one per locale, then `x-default`
 * pointing at the base-locale URL. The set is the same for every variant.
 */
export function alternates(path: string, siteUrl: string = SITE_URL): Alternate[] {
	return [
		...locales.map((locale) => ({
			hreflang: locale,
			href: absoluteUrl(localizedPath(path, locale), siteUrl)
		})),
		{ hreflang: 'x-default', href: absoluteUrl(localizedPath(path, baseLocale), siteUrl) }
	];
}
