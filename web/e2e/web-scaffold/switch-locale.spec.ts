import { expect, test } from '@playwright/test';
import { base, savedLocale } from './fixtures';

type E2EWindow = Window & {
	marker?: number;
};

test.use({ locale: 'en-US', storageState: savedLocale('pt-BR') });

test('switchLocale keeps the page, query, and hash without reloading', async ({ page }) => {
	await page.goto('como-usar?x=1#step-3');
	await expect(page.locator('h1')).toHaveText('Como usar');

	const documentRequests: string[] = [];
	page.on('request', (request) => {
		if (request.resourceType() === 'document') documentRequests.push(request.url());
	});
	await page.evaluate(() => ((window as unknown as E2EWindow).marker = 42));

	await page.getByTestId('language-switcher').click();
	await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();

	await expect(page).toHaveURL(`${base}/en/how-to-use?x=1#step-3`);
	await expect(page.locator('h1')).toHaveText('How to use');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('header a')).toHaveText(['Rusticker', 'How to use', 'About']);
	await expect(page.locator('header nav a').nth(0)).toHaveAttribute(
		'href',
		`${base}/en/how-to-use`
	);
	expect(await page.evaluate(() => (window as unknown as E2EWindow).marker)).toBe(42);
	expect(await page.evaluate(() => localStorage.getItem('PARAGLIDE_LOCALE'))).toBe('en');
	expect(documentRequests).toEqual([]);
});

test('the saved choice applies on the next visit', async ({ page }) => {
	await page.goto('sobre');
	await page.getByTestId('language-switcher').click();
	await page.getByRole('menuitemradio', { name: 'Español', exact: true }).click();
	await expect(page).toHaveURL(`${base}/es/acerca-de`);

	await page.goto('');
	await expect(page).toHaveURL(`${base}/es/`);
});
