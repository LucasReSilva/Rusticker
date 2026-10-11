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
		// The dev-only route dynamically imports the whole kit. Its first visit
		// includes Vite's cold component compilation on CI before controls exist.
		await expect(page.locator('[data-design-showcase]')).toBeVisible({ timeout: 15_000 });
		await page.keyboard.press('Tab');
		await page.getByTestId('dialog-trigger').first().focus();
		await expectRing(page.getByTestId('dialog-trigger').first());
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog')).toBeVisible();
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
		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();
		// Enter opens with the first item focused. Wait for that focus before
		// ArrowDown, which must move to the second item rather than race opening.
		await expectRing(menu.getByRole('menuitem').nth(0));
		await page.keyboard.press('ArrowDown');
		await expectRing(menu.getByRole('menuitem').nth(1));
		await page.keyboard.press('Escape');
		const boards = page.getByTestId('checkerboard');
		const backgrounds = await boards.evaluateAll((els) =>
			els.map((el) => getComputedStyle(el).backgroundImage)
		);
		expect(backgrounds[0]).not.toBe(backgrounds[1]);
	});
}
