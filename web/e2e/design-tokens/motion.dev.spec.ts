import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR', reducedMotion: 'reduce' });
test('reduced motion closes and unmounts dialogs and menus', async ({ page }) => {
	await page.goto('_design');
	await page.getByTestId('dialog-trigger').first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	expect(
		await dialog.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))
	).toBeLessThanOrEqual(0.00001);
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(page.getByTestId('dialog-trigger').first()).toBeFocused();
	await page.getByTestId('menu-trigger').first().click();
	const menu = page.getByRole('menu');
	await expect(menu).toBeVisible();
	expect(
		await menu.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))
	).toBeLessThanOrEqual(0.00001);
	await page.keyboard.press('Escape');
	await expect(menu).toHaveCount(0);
});
