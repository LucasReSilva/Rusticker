import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR' });

const routes = ['', 'en/', 'es/'];

type BrandColors = { primary: string; secondary: string; accent: string };

function expectBrandColors(colors: BrandColors, theme: 'light' | 'dark') {
	const primary = theme === 'light' ? '0.57 0.18 38' : '0.74 0.16 42';
	const secondary = theme === 'light' ? '0.94 0.05 153' : '0.28 0.055 153';
	const accent = theme === 'light' ? '0.92 0.08 153' : '0.32 0.07 153';

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
			await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
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

test('filled buttons and linked badges use contrast-checked resting, hover, and focus colors', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('_design');
	await expect(page.locator('[data-design-showcase]')).toBeVisible({ timeout: 15_000 });

	for (const theme of ['light', 'dark']) {
		const panel = page.locator(`[data-panel="${theme}"]`);
		for (const slot of ['button', 'badge']) {
			for (const name of ['primary', 'secondary', 'destructive']) {
				const control = panel
					.locator(`[data-slot="${slot}"].bg-${name}${slot === 'badge' ? '[href]' : ':enabled'}`)
					.first();
				await page.mouse.move(0, 0);
				await expect
					.poll(() =>
						control.evaluate((element, token) => {
							const style = getComputedStyle(element);
							return {
								background: style.backgroundColor === style.getPropertyValue(`--${token}`).trim(),
								foreground: style.color === style.getPropertyValue(`--${token}-foreground`).trim()
							};
						}, name)
					)
					.toEqual({ background: true, foreground: true });
				await control.hover();
				await expect
					.poll(() =>
						control.evaluate((element, token) => {
							const style = getComputedStyle(element);
							return style.backgroundColor === style.getPropertyValue(`--${token}-hover`).trim();
						}, name)
					)
					.toBe(true);
				await page.keyboard.press('Tab');
				await control.focus();
				await expect(control).toBeFocused();
				await expect
					.poll(() =>
						control.evaluate((element) => {
							const style = getComputedStyle(element);
							return style.boxShadow.includes(style.getPropertyValue('--ring').trim());
						})
					)
					.toBe(true);
				if (name !== 'secondary') {
					expect(
						await control.evaluate((element) =>
							getComputedStyle(element).getPropertyValue('--tw-ring-offset-width').trim()
						)
					).toBe('2px');
				}
			}
		}
	}
});
