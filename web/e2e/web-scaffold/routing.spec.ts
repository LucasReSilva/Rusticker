import { expect, test } from '@playwright/test';
import { base } from './fixtures';

test.use({ locale: 'fr-FR' });

test('/en redirects to /en/ and shows the English tool', async ({ page }) => {
	const response = await page.goto('en');
	expect(response?.request().redirectedFrom()?.url()).toMatch(/\/Rusticker\/en$/);
	await expect(page).toHaveURL(`${base}/en/`);
	await expect(page.locator('h1')).toHaveText('Turn a sticker sheet into a WhatsApp pack');
});

test('an unknown Spanish URL shows the Spanish not-found page', async ({ page }) => {
	const response = await page.goto('es/unknown');
	expect(response?.status()).toBe(404);
	await expect(page.locator('h1')).toHaveText('Página no encontrada');
	await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	await expect(page).toHaveTitle('Página no encontrada | Rusticker');

	await page.getByRole('link', { name: 'Volver a la herramienta' }).click();
	await expect(page).toHaveURL(`${base}/es/`);
	await expect(page.locator('h1')).toHaveText(
		'Convierte una hoja de stickers en un paquete para WhatsApp'
	);
});

test('an untranslated slug under a prefix is not found in that locale', async ({ page }) => {
	await page.goto('en/sobre');
	await expect(page.locator('h1')).toHaveText('Page not found');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('header links keep the locale', async ({ page }) => {
	await page.goto('en/about');
	await page.getByRole('navigation').getByRole('link', { name: 'How to use' }).click();
	await expect(page).toHaveURL(`${base}/en/how-to-use`);
	await expect(page.locator('h1')).toHaveText('How to use');
	await expect(page.locator('main#main-content')).toBeVisible();
});
