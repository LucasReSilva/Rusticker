import { expect, test } from '@playwright/test';

// Local only: the private sample image is never stored in the repository.
//   RUSTICKER_SAMPLE_IMAGE=/abs/path/to/sample.jpg bun run test:e2e
const samplePath = process.env.RUSTICKER_SAMPLE_IMAGE;

test.use({ locale: 'pt-BR' });

test('the sample image yields 17 stickers through the worker', async ({ page }) => {
	test.skip(!samplePath, 'RUSTICKER_SAMPLE_IMAGE is not set');
	test.setTimeout(60_000);
	await page.goto('_detection');
	const section = page.getByTestId('detection');
	await expect(section).toHaveAttribute('data-status', 'idle');

	await page.getByTestId('file').setInputFiles(samplePath!);

	await expect(section).toHaveAttribute('data-status', 'done', { timeout: 45_000 });
	await expect(page.getByTestId('count')).toHaveText('17');
	const boxes = await page
		.locator('canvas')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.getAttribute('data-bbox') ?? '').split(',').map(Number))
		);
	expect(boxes).toHaveLength(17);
	// Reading order: rows of 5, 6 and 6, each left to right, rows top to bottom.
	const centers = boxes.map(([x, y, width, height]) => ({ x: x + width / 2, y: y + height / 2 }));
	const rows = [centers.slice(0, 5), centers.slice(5, 11), centers.slice(11, 17)];
	for (const row of rows) {
		for (let i = 1; i < row.length; i++) expect(row[i].x).toBeGreaterThan(row[i - 1].x);
	}
	for (let r = 1; r < rows.length; r++) {
		expect(Math.max(...rows[r - 1].map((c) => c.y))).toBeLessThan(
			Math.min(...rows[r].map((c) => c.y))
		);
	}
});
