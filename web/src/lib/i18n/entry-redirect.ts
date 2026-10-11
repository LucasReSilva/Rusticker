import type { Locale } from '$lib/paraglide/runtime';
import { localizeCurrentUrl, stripBase } from './localize-url';
import { matchBrowserLocale } from './negotiate';
import { baseLocale, parseLocalizedPath } from './routes.js';

/**
 * Where a freshly loaded document should go (design D5), or `undefined` to
 * stay. A locale prefix in the URL always decides. An unprefixed URL moves to
 * the saved preference, else the first matching browser language, when that
 * locale is not the base locale.
 */
export function entryRedirect(
	url: URL,
	base: string,
	saved: Locale | undefined,
	languages: readonly string[]
): string | undefined {
	const path = stripBase(url.pathname, base);
	if (path === undefined) return undefined;
	if (parseLocalizedPath(path).locale !== baseLocale) return undefined;

	const target = saved ?? matchBrowserLocale(languages) ?? baseLocale;
	if (target === baseLocale) return undefined;

	return localizeCurrentUrl(url, target, base);
}
