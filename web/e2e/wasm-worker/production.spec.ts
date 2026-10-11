import { expect, test } from '@playwright/test';

// Pages project (production build under /Rusticker): the dev-only
// diagnostics page must not exist.
test.use({ locale: 'pt-BR' });

test('/_detection is not served in production', async ({ page }) => {
	const response = await page.goto('_detection');
	expect(response?.status()).toBe(404);
	await expect(page.getByTestId('detection')).toHaveCount(0);
	await expect(page.getByTestId('file')).toHaveCount(0);
});
