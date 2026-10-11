import { expect, test } from '@playwright/test';

// Exercises the `dev` project (Vite dev server, no base path). Dev-only routes
// such as /_design and /_detection get their specs as `*.dev.spec.ts` files.
test.use({ locale: 'pt-BR' });

test('the dev server renders the tool page from the root', async ({ page }) => {
	await page.goto('');
	await expect(page).toHaveURL('http://localhost:5173/');
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	await expect(page.locator('h1')).toHaveText(
		'Transforme uma folha de figurinhas em um pacote para o WhatsApp'
	);
});
