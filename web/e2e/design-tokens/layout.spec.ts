import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR', viewport: { width: 320, height: 640 } });
for (const route of ['', 'en/', 'es/']) {
	test(`header fits 320px in ${route || 'pt-BR'}`, async ({ page }) => {
		await page.goto(route);
		await expect(page.getByTestId('language-switcher')).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			320
		);
	});
}
