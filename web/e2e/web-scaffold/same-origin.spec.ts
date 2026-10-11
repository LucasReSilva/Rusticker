import { expect, test } from '@playwright/test';
import { base, origin } from './fixtures';

test.use({ locale: 'es-ES' });

test('every request stays on the site origin and base path', async ({ page }) => {
	const requests: string[] = [];
	page.on('request', (request) => requests.push(request.url()));

	await page.goto('');
	await expect(page).toHaveURL(`${base}/es/`);
	await page.getByRole('navigation').getByRole('link', { name: 'Cómo usar' }).click();
	await expect(page).toHaveURL(`${base}/es/como-usar`);
	await page.getByRole('navigation').getByRole('link', { name: 'Acerca de' }).click();
	await expect(page).toHaveURL(`${base}/es/acerca-de`);
	await page.goto('es/unknown');
	await expect(page.locator('h1')).toHaveText('Página no encontrada');

	expect(requests.length).toBeGreaterThan(0);
	const foreign = requests.filter((url) => !url.startsWith(`${origin}${base}/`));
	expect(foreign).toEqual([]);
});
