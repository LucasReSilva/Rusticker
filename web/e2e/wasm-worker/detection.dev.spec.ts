import { expect, test } from '@playwright/test';
import { grid, installPainter, runSynthetic, type Outcome, type TestWindow } from './synthetic';

// Dev project: /_detection exists only on the Vite dev server.
test.use({ locale: 'pt-BR' });

test.beforeEach(async ({ page }) => {
	await installPainter(page);
	await page.goto('_detection');
	await expect(page.getByTestId('detection')).toHaveAttribute('data-status', 'idle');
});

test('a synthetic image gives the expected stickers in reading order', async ({ page }) => {
	const spec = grid(5, 3, 600, 400);
	const outcome = await runSynthetic(page, spec);
	expect(outcome).toEqual({ status: 'done', count: 5 });
	await expect(page.getByTestId('detection')).toHaveAttribute('data-status', 'done');
	await expect(page.getByTestId('count')).toHaveText('5');
	const canvases = page.locator('canvas');
	await expect(canvases).toHaveCount(5);
	await expect(canvases.first()).toHaveAttribute('width', '512');
	await expect(canvases.first()).toHaveAttribute('height', '512');
	// Row 1 left to right, then row 2.
	const boxes = await canvases.evaluateAll((nodes) =>
		nodes.map((node) => (node.getAttribute('data-bbox') ?? '').split(',').map(Number))
	);
	expect(boxes).toEqual(spec.rects.map(({ x, y, width, height }) => [x, y, width, height]));
});

test('the main thread keeps painting during detection of a large image', async ({ page }) => {
	const spec = grid(17, 6, 2752, 1536);
	const result = await page.evaluate(async (spec) => {
		const w = window as unknown as TestWindow;
		const image = w.__paint(spec);
		let maxGap = 0;
		let frames = 0;
		let last = performance.now();
		let running = true;
		const tick = (now: number) => {
			maxGap = Math.max(maxGap, now - last);
			last = now;
			frames += 1;
			if (running) requestAnimationFrame(tick);
		};
		await new Promise((resolve) => requestAnimationFrame(resolve));
		last = performance.now();
		requestAnimationFrame(tick);
		const outcome = await w.__rusticker_detection.run(image);
		running = false;
		return { outcome, maxGap, frames };
	}, spec);
	expect(result.outcome).toEqual({ status: 'done', count: 17 });
	expect(result.frames).toBeGreaterThan(1);
	expect(result.maxGap).toBeLessThan(200);
});

test('an image without stickers fails with NoStickers', async ({ page }) => {
	const logs: string[] = [];
	page.on('console', (message) => logs.push(message.text()));
	const outcome = await runSynthetic(page, {
		width: 200,
		height: 100,
		background: [0, 255, 0],
		rects: []
	});
	expect(outcome).toEqual({ status: 'error', code: 'NoStickers' });
	await expect(page.getByTestId('detection')).toHaveAttribute('data-code', 'NoStickers');
	expect(logs.some((line) => line.startsWith('[detection] error NoStickers'))).toBe(true);
});

test('rapid requests: only the last delivers, the others are cancelled', async ({ page }) => {
	const logs: string[] = [];
	page.on('console', (message) => logs.push(message.text()));
	const outcomes = await page.evaluate(
		async (specs) => {
			const w = window as unknown as TestWindow;
			const images = specs.map((spec) => w.__paint(spec));
			return Promise.all(images.map((image) => w.__rusticker_detection.run(image)));
		},
		[grid(3, 3, 900, 300), grid(4, 4, 900, 300), grid(6, 3, 900, 600)]
	);
	expect(outcomes).toEqual<Outcome[]>([
		{ status: 'cancelled', code: 'AbortError' },
		{ status: 'cancelled', code: 'AbortError' },
		{ status: 'done', count: 6 }
	]);
	await expect(page.getByTestId('count')).toHaveText('6');
	expect(logs.filter((line) => line === '[detection] cancelled')).toHaveLength(2);
});

test('detection keeps working offline once the engine is loaded', async ({ page, context }) => {
	expect(await runSynthetic(page, grid(3, 3, 600, 200))).toEqual({ status: 'done', count: 3 });
	await context.setOffline(true);
	try {
		expect(await runSynthetic(page, grid(4, 2, 600, 400))).toEqual({ status: 'done', count: 4 });
	} finally {
		await context.setOffline(false);
	}
});

test('the wasm engine is fetched once across several runs', async ({ page }) => {
	// Finish initialization from beforeEach before observing a fresh document.
	// Otherwise its late wasm request can be counted alongside the new worker.
	expect(await runSynthetic(page, grid(2, 2, 400, 200))).toEqual({ status: 'done', count: 2 });
	const wasmRequests: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		// In dev, `...wasm?import&url` is the JS module exporting the URL, not the binary.
		if (url.pathname.endsWith('.wasm') && !url.searchParams.has('import')) {
			wasmRequests.push(request.url());
		}
	});
	// A fresh document, so the worker and its wasm load while we listen.
	await page.reload();
	await expect(page.getByTestId('detection')).toHaveAttribute('data-status', 'idle');
	for (const count of [2, 3, 4]) {
		expect(await runSynthetic(page, grid(count, 4, 800, 200))).toEqual({ status: 'done', count });
	}
	expect(wasmRequests).toHaveLength(1);
	expect(new URL(wasmRequests[0]).origin).toBe(new URL(page.url()).origin);
});
