import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR' });
for (const route of [
	'',
	'como-usar',
	'sobre',
	'en/',
	'en/how-to-use',
	'en/about',
	'es/',
	'es/como-usar',
	'es/acerca-de'
]) {
	test(`header and skip link on ${route || '/'}`, async ({ page }) => {
		await page.goto(route);
		await expect(page.getByRole('banner')).toBeVisible();
		await expect(page.getByTestId('theme-toggle')).toBeVisible();
		await expect(page.getByTestId('language-switcher')).toBeVisible();
		await page.keyboard.press('Tab');
		await expect(page.locator('a[href="#main-content"]')).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.locator('main')).toBeFocused();
	});
}
