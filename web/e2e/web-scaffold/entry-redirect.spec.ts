import { expect, test } from '@playwright/test';
import { base, savedLocale } from './fixtures';

test.describe('browser language, nothing saved', () => {
	test.use({ locale: 'en-US' });

	test('an unprefixed URL moves to the browser language', async ({ page }) => {
		await page.goto('sobre');
		await expect(page).toHaveURL(`${base}/en/about`);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await expect(page.locator('h1')).toHaveText('About Rusticker');
	});

	test('the tool URL moves to the browser language', async ({ page }) => {
		await page.goto('');
		await expect(page).toHaveURL(`${base}/en/`);
		await expect(page.locator('h1')).toHaveText('Turn a sticker sheet into a WhatsApp pack');
	});
});

test.describe('browser language with no supported match', () => {
	test.use({ locale: 'fr-FR' });

	test('falls back to pt-BR without redirecting', async ({ page }) => {
		await page.goto('como-usar');
		await expect(page.locator('h1')).toHaveText('Como usar');
		await expect(page).toHaveURL(`${base}/como-usar`);
		await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	});
});

test.describe('saved pt-BR preference', () => {
	test.use({ locale: 'en-US', storageState: savedLocale('pt-BR') });

	test('the tool stays in pt-BR', async ({ page }) => {
		await page.goto('');
		await expect(page.locator('h1')).toHaveText(
			'Transforme uma folha de figurinhas em um pacote para o WhatsApp'
		);
		await expect(page).toHaveURL(`${base}/`);
		await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	});
});

test.describe('saved es preference', () => {
	test.use({ locale: 'en-US', storageState: savedLocale('es') });

	test('a prefixed URL wins and does not overwrite the preference', async ({ page }) => {
		await page.goto('en/about');
		await expect(page.locator('h1')).toHaveText('About Rusticker');
		await expect(page).toHaveURL(`${base}/en/about`);

		await page.goto('');
		await expect(page).toHaveURL(`${base}/es/`);
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
		await expect(page.locator('h1')).toHaveText(
			'Convierte una hoja de stickers en un paquete para WhatsApp'
		);
	});

	test('keeps the query string and the hash', async ({ page }) => {
		await page.goto('como-usar?x=1#step-3');
		await expect(page).toHaveURL(`${base}/es/como-usar?x=1#step-3`);
	});
});
