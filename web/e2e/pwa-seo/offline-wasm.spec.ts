import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { base, site } from './fixtures';

// This change also runs before wasm-worker is integrated. Once the build
// contains its assets, prove that a fresh worker can initialize offline,
// rather than only reusing an engine already loaded while online.
const workersDir = fileURLToPath(new URL('../../build/_app/immutable/workers/', import.meta.url));
const workerFile = existsSync(workersDir)
	? readdirSync(workersDir).find((name) => /^worker-.*\.js$/.test(name))
	: undefined;

test.use({ locale: 'en-US' });

test('a fresh detection worker initializes and detects from the offline cache', async ({
	page,
	context
}) => {
	test.skip(workerFile === undefined, 'The standalone PWA build has no detection worker yet');
	const assetsDir = `${workersDir}/assets`;
	const wasmFiles = existsSync(assetsDir)
		? readdirSync(assetsDir).filter((name) => name.endsWith('.wasm'))
		: [];
	expect(wasmFiles, 'the integrated build contains the detection wasm').toHaveLength(1);

	await page.goto('en/');
	await page.evaluate(async () => navigator.serviceWorker.ready);
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
		.toBe(true);

	const requests: URL[] = [];
	page.on('request', (request) => requests.push(new URL(request.url())));
	await context.setOffline(true);
	const reply = await page.evaluate(async (workerUrl) => {
		const width = 300;
		const height = 100;
		const pixels = new Uint8Array(width * height * 4);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const offset = (y * width + x) * 4;
				const inSquare =
					y >= 20 && y < 80 && [20, 120, 220].some((start) => x >= start && x < start + 60);
				pixels.set(inSquare ? [220, 30, 30, 255] : [0, 255, 0, 255], offset);
			}
		}
		const worker = new Worker(workerUrl, { type: 'module' });
		try {
			return await new Promise<{ ok: boolean; count: number; sizes: number[] }>(
				(resolve, reject) => {
					worker.addEventListener('error', (event) => reject(new Error(event.message)));
					worker.addEventListener('message', (event) => {
						const value = event.data.value as {
							ok: boolean;
							stickers?: Array<{ rgba: ArrayBuffer }>;
						};
						const stickers = value.stickers ?? [];
						resolve({
							ok: value.ok,
							count: stickers.length,
							sizes: stickers.map((sticker) => sticker.rgba.byteLength)
						});
					});
					// Invoke detect using Comlink's wire protocol; the production
					// tool page does not expose the development diagnostic hook.
					worker.postMessage({
						id: 'offline-detection',
						type: 'APPLY',
						path: ['detect'],
						argumentList: [
							{
								type: 'RAW',
								value: { rgba: pixels.buffer, width, height, background: 0x00ff00, tolerance: 50 }
							}
						]
					});
				}
			);
		} finally {
			worker.terminate();
		}
	}, `${base}/_app/immutable/workers/${workerFile}`);

	expect(reply).toEqual({ ok: true, count: 3, sizes: [1048576, 1048576, 1048576] });
	const origin = new URL(site).origin;
	expect(requests.some((url) => url.pathname.endsWith('.wasm'))).toBe(true);
	for (const url of requests) {
		expect(url.origin).toBe(origin);
		expect(url.pathname.startsWith(`${base}/`)).toBe(true);
	}
});
