import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR', colorScheme: 'light' });

test('theme persists before hydration, follows system live, and restores trigger focus', async ({
	page
}) => {
	await page.goto('');
	const trigger = page.getByTestId('theme-toggle');
	await trigger.click();
	await page.getByRole('menuitemradio', { name: 'Escuro', exact: true }).click();
	await expect(page.locator('html')).toHaveClass(/dark/);
	await page.reload({ waitUntil: 'domcontentloaded' });
	expect(await page.locator('html').evaluate((html) => html.classList.contains('dark'))).toBe(true);
	await trigger.click();
	await page.getByRole('menuitemradio', { name: 'Sistema', exact: true }).click();
	await expect(page.locator('html')).not.toHaveClass(/dark/);
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect(page.locator('html')).toHaveClass(/dark/);
	await trigger.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('menu')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toHaveCount(0);
	await expect(trigger).toBeFocused();
});
