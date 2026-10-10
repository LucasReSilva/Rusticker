import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	baseLocale,
	buildUrlPatterns,
	internalPath,
	pages,
	parseLocalizedPath,
	prerenderEntries
} from './routes.js';

const settings = JSON.parse(
	readFileSync(new URL('../../../project.inlang/settings.json', import.meta.url), 'utf8')
) as { baseLocale: string; locales: string[] };

/**
 * Resolves a URL the way Paraglide does with custom patterns: the first
 * element whose localized pattern matches wins, and the internal path is the
 * element's base pattern filled with the captured `path`.
 */
function resolveWithPatterns(base: string, path: string) {
	const url = new URL(`https://example.test${base}${path}`);
	for (const element of buildUrlPatterns(base)) {
		for (const [locale, pattern] of element.localized) {
			const match = new URLPattern(pattern, url.href).exec(url.href);
			if (!match) continue;
			const captured = match.pathname.groups.path;
			const internal = element.pattern.replace('/:path(.*)?', captured ? `/${captured}` : '/');
			return { locale, internal };
		}
	}
	return undefined;
}

describe('route table', () => {
	it('matches the contract slugs', () => {
		expect(pages).toEqual({
			tool: { 'pt-BR': '/', en: '/en/', es: '/es/' },
			howToUse: { 'pt-BR': '/como-usar', en: '/en/how-to-use', es: '/es/como-usar' },
			about: { 'pt-BR': '/sobre', en: '/en/about', es: '/es/acerca-de' }
		});
		expect(internalPath).toEqual({ tool: '/', howToUse: '/how-to-use', about: '/about' });
	});

	it('has a slug for every configured locale', () => {
		expect(baseLocale).toBe(settings.baseLocale);
		for (const slugs of Object.values(pages)) {
			expect(Object.keys(slugs).sort()).toEqual([...settings.locales].sort());
		}
	});

	it('lists the 9 localized paths as prerender entries', () => {
		expect(prerenderEntries().sort()).toEqual(
			[
				'/',
				'/en/',
				'/es/',
				'/como-usar',
				'/en/how-to-use',
				'/es/como-usar',
				'/sobre',
				'/en/about',
				'/es/acerca-de'
			].sort()
		);
	});

	it('orders the catch-alls /en/*, /es/*, then /*', () => {
		const catchAll = buildUrlPatterns('').at(-1);
		expect(catchAll?.localized).toEqual([
			['en', '/en/:path(.*)?'],
			['es', '/es/:path(.*)?'],
			['pt-BR', '/:path(.*)?']
		]);
	});
});

describe.each(['', '/Rusticker'])('URL patterns with base "%s"', (base) => {
	const cases: Array<[string, string, string]> = [
		['/', 'pt-BR', '/'],
		['/en/', 'en', '/'],
		['/en', 'en', '/'],
		['/es/', 'es', '/'],
		['/es', 'es', '/'],
		['/como-usar', 'pt-BR', '/how-to-use'],
		['/en/how-to-use', 'en', '/how-to-use'],
		['/es/como-usar', 'es', '/how-to-use'],
		['/sobre', 'pt-BR', '/about'],
		['/en/about', 'en', '/about'],
		['/es/acerca-de', 'es', '/about'],
		['/en/sobre', 'en', '/sobre'],
		['/es/unknown', 'es', '/unknown']
	];

	it.each(cases)('%s resolves to locale %s and internal path %s', (path, locale, internal) => {
		expect(resolveWithPatterns(base, path)).toEqual({ locale, internal: base + internal });
	});
});

describe('parseLocalizedPath', () => {
	it('finds the page and locale of every slug', () => {
		for (const [page, slugs] of Object.entries(pages)) {
			for (const [locale, slug] of Object.entries(slugs)) {
				expect(parseLocalizedPath(slug)).toMatchObject({ locale, page });
			}
		}
	});

	it('accepts tool URLs without the trailing slash', () => {
		expect(parseLocalizedPath('/en')).toMatchObject({ locale: 'en', page: 'tool' });
	});

	it('keeps the rest of unknown paths', () => {
		expect(parseLocalizedPath('/en/sobre')).toEqual({ locale: 'en', page: undefined, rest: '/sobre' });
		expect(parseLocalizedPath('/unknown')).toEqual({
			locale: 'pt-BR',
			page: undefined,
			rest: '/unknown'
		});
		expect(parseLocalizedPath('/english')).toMatchObject({ locale: 'pt-BR', rest: '/english' });
	});
});
