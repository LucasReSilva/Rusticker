import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR' });

const routes = ['', 'en/', 'es/'];

type BrandColors = { primary: string; secondary: string; accent: string };

function expectBrandColors(colors: BrandColors, theme: 'light' | 'dark') {
	const primary = theme === 'light' ? '0.56 0.14 42' : '0.75 0.12 42';
	const secondary = theme === 'light' ? '0.94 0.05 145' : '0.28 0.06 145';
	const accent = theme === 'light' ? '0.92 0.07 148' : '0.32 0.07 148';

	expect(colors.primary).toBe(`oklch(${primary})`);
	expect(colors.secondary).toBe(`oklch(${secondary})`);
	expect(colors.accent).toBe(`oklch(${accent})`);
}

for (const colorScheme of ['light', 'dark'] as const) {
	test(`orange and green palette renders on public pages and design showcase in ${colorScheme}`, async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme });

		for (const route of routes) {
			const response = await page.goto(route);
			expect(response?.status()).toBe(200);
			await expect(page.locator('h1')).toBeVisible();
			await page.waitForFunction(
				() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() !== ''
			);
			const colors = await page.locator('html').evaluate((element) => {
				const style = getComputedStyle(element);
				return {
					primary: style.getPropertyValue('--primary').trim(),
					secondary: style.getPropertyValue('--secondary').trim(),
					accent: style.getPropertyValue('--accent').trim()
				};
			});
			expectBrandColors(colors, colorScheme);
		}

		await page.goto('_design');
		await expect(page.locator('[data-design-showcase]')).toBeVisible({ timeout: 15_000 });

		const panels = await page.locator('[data-panel]').evaluateAll((elements) =>
			elements.map((element) => {
				const style = getComputedStyle(element);
				return {
					theme: element.getAttribute('data-panel'),
					primary: style.getPropertyValue('--primary').trim(),
					secondary: style.getPropertyValue('--secondary').trim(),
					accent: style.getPropertyValue('--accent').trim()
				};
			})
		);

		const lightPanel = panels.find((panel) => panel.theme === 'light');
		const darkPanel = panels.find((panel) => panel.theme === 'dark');
		expect(lightPanel).toBeDefined();
		expect(darkPanel).toBeDefined();
		expectBrandColors(lightPanel!, 'light');
		expectBrandColors(darkPanel!, 'dark');
	});
}
