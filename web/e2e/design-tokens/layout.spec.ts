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

const publicPages = [
	'',
	'como-usar',
	'sobre',
	'historico',
	'en/',
	'en/how-to-use',
	'en/about',
	'en/history',
	'es/',
	'es/como-usar',
	'es/acerca-de',
	'es/historial'
];

for (const route of publicPages) {
	test(`public page content fits 375px in both themes: ${route || 'pt-BR tool'}`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto(route);
		for (const theme of ['light', 'dark']) {
			await page.evaluate((value) => {
				document.documentElement.classList.toggle('light', value === 'light');
				document.documentElement.classList.toggle('dark', value === 'dark');
			}, theme);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth),
				`${route || 'pt-BR tool'} should not overflow in ${theme} theme`
			).toBeLessThanOrEqual(375);
		}
	});
}
