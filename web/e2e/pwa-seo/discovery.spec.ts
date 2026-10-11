import { expect, test } from '@playwright/test';
import { base, locales, pageIds, site, urls } from './fixtures';

const names = {
	'pt-BR': 'Rusticker: figurinhas para WhatsApp',
	en: 'Rusticker: WhatsApp stickers',
	es: 'Rusticker: stickers para WhatsApp'
};

test('sitemap.xml lists the 9 public URLs', async ({ request }) => {
	const response = await request.get(`${base}/sitemap.xml`);
	expect(response.status()).toBe(200);
	const xml = await response.text();
	const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
	expect(locs.sort()).toEqual(
		pageIds.flatMap((id) => locales.map((locale) => `${site}${urls[id][locale]}`)).sort()
	);
	expect(xml.match(/<url>/g)).toHaveLength(9);
	expect(xml.match(/hreflang="x-default"/g)).toHaveLength(9);
	expect(xml).not.toContain(`${site}/_`);
});

test('robots.txt points to the absolute sitemap', async ({ request }) => {
	const response = await request.get(`${base}/robots.txt`);
	expect(response.status()).toBe(200);
	const text = await response.text();
	expect(text).toContain('User-agent: *');
	expect(text).toContain(`Sitemap: ${site}/sitemap.xml`);
});

for (const locale of locales) {
	test(`manifest-${locale}.webmanifest is localized`, async ({ request }) => {
		const response = await request.get(`${base}/manifest-${locale}.webmanifest`);
		expect(response.status()).toBe(200);
		const manifest = JSON.parse(await response.text());
		expect(manifest.name).toBe(names[locale]);
		expect(manifest.lang).toBe(locale);
		expect(manifest.id).toBe(`${base}/`);
		expect(manifest.scope).toBe(`${base}/`);
		expect(manifest.start_url).toBe(`${base}${urls.tool[locale]}`);
		for (const icon of manifest.icons as Array<{ src: string }>) {
			expect((await request.get(icon.src)).status()).toBe(200);
		}
	});
}
