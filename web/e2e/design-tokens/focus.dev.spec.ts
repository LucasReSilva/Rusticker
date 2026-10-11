import { expect, test, type Locator } from '@playwright/test';

test.use({ locale: 'pt-BR' });
async function expectRing(control: Locator) {
	await expect(control).toBeFocused();
	expect(await control.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
}
for (const colorScheme of ['light', 'dark'] as const) {
	test(`keyboard focus and theme panels in ${colorScheme}`, async ({ page }) => {
		await page.emulateMedia({ colorScheme });
		await page.goto('_design');
		await expect(page.locator('[data-design-showcase]')).toBeVisible();
		await page.keyboard.press('Tab');
		await page.getByTestId('dialog-trigger').first().focus();
		await expectRing(page.getByTestId('dialog-trigger').first());
		await page.keyboard.press('Enter');
		const close = page
			.getByRole('dialog')
			.getByRole('button', { name: 'Fechar', exact: true })
			.first();
		await close.focus();
		await expectRing(close);
		await page.keyboard.press('Escape');
		await page.getByRole('slider').first().focus();
		await expectRing(page.getByRole('slider').first());
		await page.getByTestId('menu-trigger').first().focus();
		await page.keyboard.press('Enter');
		await page.keyboard.press('ArrowDown');
		await expectRing(page.getByRole('menuitem').first());
		await page.keyboard.press('Escape');
		const boards = page.getByTestId('checkerboard');
		const backgrounds = await boards.evaluateAll((els) =>
			els.map((el) => getComputedStyle(el).backgroundImage)
		);
		expect(backgrounds[0]).not.toBe(backgrounds[1]);
	});
}
