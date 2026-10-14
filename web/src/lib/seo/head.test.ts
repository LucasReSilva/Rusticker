import { describe, expect, it } from 'vitest';
import { headTags, renderHeadTags } from './head';

const site = 'https://example.github.io/Rusticker';

describe('headTags', () => {
	it('builds the tags of the Spanish how-to-use page', () => {
		const tags = headTags('/como-usar', 'es', '/Rusticker', site);
		const attrs = Object.fromEntries(tags.map((tag) => [tag.key, tag.attrs]));
		expect(attrs.canonical.href).toBe(`${site}/es/como-usar`);
		expect(attrs['alternate-pt-BR'].href).toBe(`${site}/como-usar`);
		expect(attrs['alternate-en'].href).toBe(`${site}/en/how-to-use`);
		expect(attrs['alternate-es'].href).toBe(`${site}/es/como-usar`);
		expect(attrs['alternate-x-default'].href).toBe(`${site}/como-usar`);
		expect(attrs.manifest.href).toBe('/Rusticker/manifest-es.webmanifest');
		expect(attrs['apple-touch-icon'].href).toBe('/Rusticker/icons/apple-touch-icon-180x180.png');
		expect(attrs['theme-color'].content).toBe('#CA430E');
	});

	it('keeps the trailing slash on tool URLs', () => {
		const tags = headTags('/', 'en', '/Rusticker', site);
		const hrefs = tags.filter((tag) => tag.tag === 'link').map((tag) => tag.attrs.href);
		expect(hrefs).toContain(`${site}/en/`);
		expect(hrefs).toContain(`${site}/es/`);
		expect(hrefs).not.toContain(`${site}/en`);
	});

	it('renders marked HTML elements', () => {
		const html = renderHeadTags(headTags('/sobre', 'en', '', site));
		expect(html).toContain(
			`<link rel="canonical" href="${site}/en/about" data-pwa-seo="canonical">`
		);
		expect(html.match(/hreflang=/g)).toHaveLength(4);
	});
});
