import { expect, test } from '@playwright/test';
import { savedLocale } from '../web-scaffold/fixtures';
import { base, headLinks, locales, pageIds, site, urls } from './fixtures';

for (const id of pageIds) {
	for (const locale of locales) {
		const path = urls[id][locale];

		test(`served HTML of ${path} declares canonical and alternates`, async ({ request }) => {
			const response = await request.get(`${base}${path}`);
			expect(response.status()).toBe(200);
			const links = headLinks(await response.text());

			const canonical = links.filter((link) => link.rel === 'canonical');
			expect(canonical.map((link) => link.href)).toEqual([`${site}${path}`]);

			const alternates = links
				.filter((link) => link.rel === 'alternate')
				.map((link) => [link.hreflang, link.href]);
			expect(alternates).toEqual([
				...locales.map((other) => [other, `${site}${urls[id][other]}`]),
				['x-default', `${site}${urls[id]['pt-BR']}`]
			]);
			for (const [, href] of alternates) expect(href.startsWith(`${site}/`)).toBe(true);

			expect(links.filter((link) => link.rel === 'manifest').map((link) => link.href)).toEqual([
				`${base}/manifest-${locale}.webmanifest`
			]);
		});
	}
}

test.describe('after a locale switch without reload', () => {
	test.use({ locale: 'en-US', storageState: savedLocale('pt-BR') });

	test('the canonical, alternates and manifest follow the new page', async ({ page }) => {
		await page.goto('sobre');
		await expect(page.locator('h1')).toHaveText('Sobre o Rusticker');

		const documentRequests: string[] = [];
		page.on('request', (request) => {
			if (request.resourceType() === 'document') documentRequests.push(request.url());
		});
		const switcher = page.getByTestId('language-switcher');
		if ((await switcher.count()) > 0) {
			// The design system supplies the real language menu once integrated.
			await switcher.click();
			await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
		} else {
			// The standalone PWA branch still has the scaffold's test hook.
			await page.waitForFunction(() => '__rusticker_e2e' in window);
			await page.evaluate(() =>
				(
					window as unknown as { __rusticker_e2e: { switchLocale: (l: string) => Promise<void> } }
				).__rusticker_e2e.switchLocale('en')
			);
		}

		await expect(page).toHaveURL(`${base}/en/about`);
		await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
			'href',
			`${base}/manifest-en.webmanifest`
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site}/en/about`);
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
		await expect(page.locator('link[rel="alternate"]')).toHaveCount(4);
		await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
			'href',
			`${site}/es/acerca-de`
		);
		expect(documentRequests).toEqual([]);
	});
});
