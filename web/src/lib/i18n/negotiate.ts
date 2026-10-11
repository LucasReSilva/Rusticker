import { locales, type Locale } from '$lib/paraglide/runtime';

const primary = (tag: string) => tag.toLowerCase().split('-')[0];

/**
 * The first browser language that matches a supported locale. For each tag,
 * in order, an exact (case-insensitive) match wins; otherwise the primary
 * subtags are compared, so `en-US` matches `en` and `pt-PT` matches `pt-BR`.
 */
export function matchBrowserLocale(
	languages: readonly string[],
	supported: readonly Locale[] = locales
): Locale | undefined {
	for (const tag of languages) {
		const exact = supported.find((locale) => locale.toLowerCase() === tag.toLowerCase());
		if (exact) return exact;
		const sameLanguage = supported.find((locale) => primary(locale) === primary(tag));
		if (sameLanguage) return sameLanguage;
	}
	return undefined;
}
