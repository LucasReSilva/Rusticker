import { beforeEach, describe, expect, it } from 'vitest';
import { headTags, renderHeadTags } from '$lib/seo/head';
import { SITE_URL } from '$lib/seo/site';
import { syncHeadTags } from './head-sync';

const href = (key: string) =>
	document.head.querySelector(`[data-pwa-seo="${key}"]`)?.getAttribute('href');

describe('syncHeadTags', () => {
	beforeEach(() => {
		// The document as prerendered for /sobre.
		document.head.innerHTML = `<title>Sobre</title>${renderHeadTags(headTags('/sobre', 'pt-BR', ''))}`;
	});

	it('follows a navigation from /sobre to /en/about', () => {
		const before = document.head.querySelector('[data-pwa-seo="canonical"]');
		syncHeadTags(document, new URL('http://localhost:4173/en/about'), '', 'en');

		expect(href('canonical')).toBe(`${SITE_URL}/en/about`);
		expect(href('alternate-pt-BR')).toBe(`${SITE_URL}/sobre`);
		expect(href('alternate-en')).toBe(`${SITE_URL}/en/about`);
		expect(href('alternate-es')).toBe(`${SITE_URL}/es/acerca-de`);
		expect(href('alternate-x-default')).toBe(`${SITE_URL}/sobre`);
		expect(href('manifest')).toBe('/manifest-en.webmanifest');
		// Elements are updated in place, never duplicated.
		expect(document.head.querySelector('[data-pwa-seo="canonical"]')).toBe(before);
		expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
		expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(4);
	});

	it('drops canonical and alternates on a page that is not public', () => {
		syncHeadTags(document, new URL('http://localhost:4173/es/nada'), '', 'es');
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
		expect(document.head.querySelector('link[rel="alternate"]')).toBeNull();
		expect(href('manifest')).toBe('/manifest-es.webmanifest');
	});

	it('creates missing tags, e.g. after the SPA fallback page', () => {
		document.head.innerHTML = '<title>x</title>';
		syncHeadTags(document, new URL('http://localhost:4173/es/'), '', 'es');
		expect(href('canonical')).toBe(`${SITE_URL}/es/`);
		expect(document.head.querySelector('meta[name="theme-color"]')).not.toBeNull();
	});
});
