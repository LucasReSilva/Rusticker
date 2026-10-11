import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

test.use({ locale: 'pt-BR' });
test('showcase is excluded from production assets and responds as not found', async ({ page }) => {
	function inspect(directory: string) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) inspect(path);
			else if (/\.(js|html|xml|css)$/.test(path)) {
				expect(readFileSync(path, 'utf8'), path).not.toContain('data-design-showcase');
			}
		}
	}
	inspect('build');
	expect(readdirSync('build').filter((name) => name.includes('_design'))).toEqual([]);
	const response = await page.goto('_design');
	expect(response?.status()).toBe(404);
	await expect(page.locator('h1')).toHaveText('Página não encontrada');
	await expect(page.locator('[data-design-showcase]')).toHaveCount(0);
});
