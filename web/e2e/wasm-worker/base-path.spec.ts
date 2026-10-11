import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { base, origin } from '../web-scaffold/fixtures';

// Pages project: the production build served under /Rusticker. No page uses
// the detector yet (the tool UI comes later), so the test starts the built
// detection worker directly and talks to it with Comlink's wire protocol.
test.use({ locale: 'pt-BR' });

const workersDir = fileURLToPath(new URL('../../build/_app/immutable/workers/', import.meta.url));

test('the built worker loads its wasm under the base path and detects', async ({ page }) => {
	const workerFile = readdirSync(workersDir).find((name) => /^worker-.*\.js$/.test(name));
	expect(workerFile, 'built detection worker').toBeDefined();
	const wasmFiles = readdirSync(`${workersDir}/assets`).filter((name) => name.endsWith('.wasm'));
	// One hashed binary, precacheable as a normal static asset.
	expect(wasmFiles).toHaveLength(1);
	expect(wasmFiles[0]).toMatch(/^rusticker_core_bg-[\w-]+\.wasm$/);

	const requests: URL[] = [];
	page.on('request', (request) => requests.push(new URL(request.url())));
	await page.goto('');

	const reply = await page.evaluate(async (workerUrl) => {
		const width = 300;
		const height = 100;
		const pixels = new Uint8Array(width * height * 4);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const offset = (y * width + x) * 4;
				// Three red squares on green.
				const inSquare =
					y >= 20 && y < 80 && [20, 120, 220].some((left) => x >= left && x < left + 60);
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
							sizes: stickers.map((s) => s.rgba.byteLength)
						});
					});
					worker.postMessage({
						id: 'base-path',
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
	const wasm = requests.filter((url) => url.pathname.endsWith('.wasm'));
	expect(wasm).toHaveLength(1);
	expect(wasm[0].origin).toBe(origin);
	expect(wasm[0].pathname).toBe(`${base}/_app/immutable/workers/assets/${wasmFiles[0]}`);
	// Every same-origin request stays under the base path.
	const sameOrigin = requests.filter((url) => url.origin === origin);
	expect(sameOrigin.length).toBeGreaterThan(0);
	for (const url of sameOrigin) expect(url.pathname.startsWith(`${base}/`)).toBe(true);
	// And nothing goes anywhere else.
	expect(
		requests.filter((url) => url.origin !== origin && url.protocol.startsWith('http'))
	).toEqual([]);
});
