// The single source of truth for page slugs (design D4).
//
// Plain ESM with JSDoc types so svelte.config.js, vite.config.ts, the app,
// and the tests can all import it. Route directories under src/routes are
// English and locale-neutral; localized slugs exist only here.

/** @typedef {'pt-BR' | 'en' | 'es'} RouteLocale */
/** @typedef {'tool' | 'howToUse' | 'about' | 'history' | 'upscaler'} PageId */
/** @typedef {{ pattern: string, localized: Array<[RouteLocale, string]> }} UrlPattern */

/** The base locale is served without a URL prefix. */
export const baseLocale = /** @type {const} */ ('pt-BR');

/**
 * Localized path of every page, relative to the site's base path.
 * The tool uses a trailing slash so each locale's shell lives at
 * `<locale>/index.html` (design D2).
 * @type {Record<PageId, Record<RouteLocale, string>>}
 */
export const pages = {
	tool: { 'pt-BR': '/', en: '/en/', es: '/es/' },
	howToUse: { 'pt-BR': '/como-usar', en: '/en/how-to-use', es: '/es/como-usar' },
	about: { 'pt-BR': '/sobre', en: '/en/about', es: '/es/acerca-de' },
	history: { 'pt-BR': '/historico', en: '/en/history', es: '/es/historial' },
	upscaler: { 'pt-BR': '/ampliar/', en: '/en/upscaler/', es: '/es/escalar-imagen/' }
};

/**
 * The internal (route directory) path of every page.
 * @type {Record<PageId, string>}
 */
export const internalPath = {
	tool: '/',
	howToUse: '/how-to-use',
	about: '/about',
	history: '/history',
	upscaler: '/upscaler'
};

/** @type {PageId[]} */
export const pageIds = /** @type {PageId[]} */ (Object.keys(pages));

/**
 * Locales in routing order: prefixed locales first, the unprefixed base last,
 * so a prefixed URL never falls into the base locale's catch-all.
 * @type {RouteLocale[]}
 */
export const routeLocales = [
	.../** @type {RouteLocale[]} */ (Object.keys(pages.tool)).filter((l) => l !== baseLocale),
	baseLocale
];

/**
 * The URL prefix of a locale (`''` for the base locale, `/en` for `en`).
 * @param {RouteLocale} locale
 * @returns {string}
 */
export function localePrefix(locale) {
	return pages.tool[locale].replace(/\/$/, '');
}

/**
 * Paraglide URL patterns for the given base path (design D4): one entry per
 * page, then a catch-all per locale (`/en/*`, `/es/*`, then `/*`) so unknown
 * URLs still resolve to the locale their prefix implies.
 * @param {string} base `''` or a path such as `/Rusticker`
 * @returns {UrlPattern[]}
 */
export function buildUrlPatterns(base) {
	/** @type {UrlPattern[]} */
	const patterns = pageIds.map((id) => ({
		pattern: base + internalPath[id],
		localized: routeLocales.map((locale) => {
			const slug = pages[id][locale];
			// Tool URLs work with or without the trailing slash (`/en` and `/en/`).
			const pattern =
				['tool', 'upscaler'].includes(id) && slug !== '/' ? `${slug.replace(/\/$/, '')}{/}?` : slug;
			return /** @type {[RouteLocale, string]} */ ([locale, base + pattern]);
		})
	}));
	patterns.push({
		pattern: `${base}/:path(.*)?`,
		localized: routeLocales.map((locale) => [locale, `${base}${localePrefix(locale)}/:path(.*)?`])
	});
	return patterns;
}

/**
 * Every localized page path, without the base path (SvelteKit prepends it).
 * @returns {string[]}
 */
export function prerenderEntries() {
	return pageIds.flatMap((id) => routeLocales.map((locale) => pages[id][locale]));
}

/**
 * Splits a base-relative pathname into its locale, and the page it shows when
 * the path is one of the localized slugs. `rest` is the path without the
 * locale prefix (always starting with `/`).
 * @param {string} pathname a path relative to the base path, e.g. `/en/about`
 * @returns {{ locale: RouteLocale, page: PageId | undefined, rest: string }}
 */
export function parseLocalizedPath(pathname) {
	for (const locale of routeLocales) {
		for (const id of pageIds) {
			const slug = pages[id][locale];
			if (
				pathname === slug ||
				(['tool', 'upscaler'].includes(id) && pathname === slug.replace(/\/$/, ''))
			) {
				return { locale, page: id, rest: internalPath[id] };
			}
		}
	}
	for (const locale of routeLocales) {
		const prefix = localePrefix(locale);
		if (prefix === '') continue;
		if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
			return { locale, page: undefined, rest: pathname.slice(prefix.length) || '/' };
		}
	}
	return { locale: baseLocale, page: undefined, rest: pathname };
}
