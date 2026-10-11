import { expect, test } from '@playwright/test';
import { base } from './fixtures';

test.use({ locale: 'en-US' });

test('the service worker precaches every locale for offline use', async ({ page, context }) => {
	await page.goto('en/');
	await expect(page.locator('h1')).toHaveText('Turn a sticker sheet into a WhatsApp pack');

	// Wait until the worker is active (install = precache finished); it only
	// controls documents loaded after that.
	const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
	expect(new URL(scope).pathname).toBe(`${base}/`);
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
		.toBe(true);

	await context.setOffline(true);
	await page.reload();
	await expect(page.locator('h1')).toHaveText('Turn a sticker sheet into a WhatsApp pack');

	await page.goto('es/acerca-de');
	await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	await expect(page.locator('h1')).toHaveText('Acerca de Rusticker');

	await page.goto('en/about');
	await expect(page.locator('h1')).toHaveText('About Rusticker');

	await page.goto('en/');
	await expect(page.locator('h1')).toHaveText('Turn a sticker sheet into a WhatsApp pack');
});

test('the service worker never precaches dev-only routes', async ({ request }) => {
	const sw = await (await request.get(`${base}/sw.js`)).text();
	const urls = [...sw.matchAll(/\burl:\s*"([^"]*)"/g)].map((match) => match[1]);
	expect(urls).toContain('404.html');
	expect(urls).toContain('es/acerca-de');
	expect(urls.filter((url) => /(^|\/)_(?!app\/)/.test(url))).toEqual([]);
});
