import { describe, expect, it } from 'vitest';
import { locales } from '$lib/paraglide/runtime';
import {
	PUBLIC_PAGES,
	absoluteUrl,
	alternates,
	localizedPath,
	pageFromPath,
	pageFromUrl
} from './urls';

const site = 'https://example.github.io/Rusticker';

// The public URL contract (search-discoverability spec): tool URLs end with a
// slash, content pages do not.
const table = {
	'/': { 'pt-BR': '/', en: '/en/', es: '/es/' },
	'/como-usar': { 'pt-BR': '/como-usar', en: '/en/how-to-use', es: '/es/como-usar' },
	'/sobre': { 'pt-BR': '/sobre', en: '/en/about', es: '/es/acerca-de' }
} as const;

type Page = keyof typeof table;
const pageList = Object.keys(table) as Page[];

describe('localized URLs', () => {
	it('lists the three public pages', () => {
		expect([...PUBLIC_PAGES]).toEqual(pageList);
	});

	it.each(pageList.flatMap((page) => locales.map((locale) => [page, locale] as const)))(
		'maps %s in %s to the contract URL',
		(page, locale) => {
			const path = table[page][locale];
			expect(localizedPath(page, locale)).toBe(path);
			expect(pageFromPath(path)).toEqual({ page, locale });
		}
	);

	it('rejects non-public pages', () => {
		expect(() => localizedPath('/_design', 'en')).toThrow();
		expect(pageFromPath('/_design')).toBeUndefined();
		expect(pageFromPath('/en/unknown')).toBeUndefined();
	});

	it('accepts the tool URL without the trailing slash', () => {
		expect(pageFromPath('/en')).toEqual({ page: '/', locale: 'en' });
	});

	it('finds the page of a full URL under the base path', () => {
		const url = new URL('https://example.github.io/Rusticker/es/acerca-de?x=1');
		expect(pageFromUrl(url, '/Rusticker')).toEqual({ page: '/sobre', locale: 'es' });
		expect(
			pageFromUrl(new URL('https://example.github.io/other/sobre'), '/Rusticker')
		).toBeUndefined();
		expect(pageFromUrl(new URL('https://example.github.io/Rusticker'), '/Rusticker')).toEqual({
			page: '/',
			locale: 'pt-BR'
		});
	});

	it('builds absolute URLs with the base path exactly once', () => {
		expect(absoluteUrl('/en/about', site)).toBe('https://example.github.io/Rusticker/en/about');
		expect(absoluteUrl('/', `${site}/`)).toBe('https://example.github.io/Rusticker/');
	});
});

describe('alternates', () => {
	it.each(pageList)('declares every locale and x-default for %s', (page) => {
		expect(alternates(page, site)).toEqual([
			...locales.map((locale) => ({ hreflang: locale, href: `${site}${table[page][locale]}` })),
			{ hreflang: 'x-default', href: `${site}${table[page]['pt-BR']}` }
		]);
	});

	it('is the same set for every variant of a page', () => {
		for (const page of pageList) {
			const sets = locales.map((locale) => {
				const found = pageFromPath(localizedPath(page, locale));
				return alternates(found?.page ?? '', site);
			});
			for (const set of sets) expect(set).toEqual(sets[0]);
		}
	});
});
