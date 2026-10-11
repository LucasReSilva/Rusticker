import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false, locale: 'en-US' });

test('the Spanish about page is readable without scripts', async ({ page }) => {
	await page.goto('es/acerca-de');
	await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	await expect(page.locator('h1')).toHaveText('Acerca de Rusticker');
	await expect(page.getByText('Tus imágenes nunca se suben a ningún servidor.')).toBeVisible();
	await expect(page).toHaveTitle('Acerca de Rusticker y tu privacidad');
});
