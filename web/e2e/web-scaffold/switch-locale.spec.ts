import { expect, test } from '@playwright/test';
import { base, savedLocale } from './fixtures';

type E2EWindow = Window & {
	__rusticker_e2e: { switchLocale: (locale: string) => Promise<void> };
	marker?: number;
};

test.use({ locale: 'en-US', storageState: savedLocale('pt-BR') });

test('switchLocale keeps the page, query, and hash without reloading', async ({ page }) => {
	await page.goto('como-usar?x=1#step-3');
	await expect(page.locator('h1')).toHaveText('Como usar');
	await page.waitForFunction(() => '__rusticker_e2e' in window);

	const documentRequests: string[] = [];
	page.on('request', (request) => {
		if (request.resourceType() === 'document') documentRequests.push(request.url());
	});
	await page.evaluate(() => ((window as unknown as E2EWindow).marker = 42));

	await page.evaluate(() => (window as unknown as E2EWindow).__rusticker_e2e.switchLocale('en'));

	await expect(page).toHaveURL(`${base}/en/how-to-use?x=1#step-3`);
	await expect(page.locator('h1')).toHaveText('How to use');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('header a')).toHaveText(['Rusticker', 'Tool', 'How to use', 'About']);
	await expect(page.locator('header nav a').nth(1)).toHaveAttribute(
		'href',
		`${base}/en/how-to-use`
	);
	expect(await page.evaluate(() => (window as unknown as E2EWindow).marker)).toBe(42);
	expect(await page.evaluate(() => localStorage.getItem('PARAGLIDE_LOCALE'))).toBe('en');
	expect(documentRequests).toEqual([]);
});

test('the saved choice applies on the next visit', async ({ page }) => {
	await page.goto('sobre');
	await page.waitForFunction(() => '__rusticker_e2e' in window);
	await page.evaluate(() => (window as unknown as E2EWindow).__rusticker_e2e.switchLocale('es'));
	await expect(page).toHaveURL(`${base}/es/acerca-de`);

	await page.goto('');
	await expect(page).toHaveURL(`${base}/es/`);
});
