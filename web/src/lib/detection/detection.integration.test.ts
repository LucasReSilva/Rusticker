// Local-only check (design D8): runs the real wasm engine on the private
// sample image. The image is never stored in the repository; point
// RUSTICKER_SAMPLE_IMAGE at its absolute path to run this suite:
//   RUSTICKER_SAMPLE_IMAGE=/abs/path/to/sample.jpg bun run test
// Without the variable (as in CI) the suite is skipped.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import jpeg from 'jpeg-js';
import init from 'rusticker-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { runDetect } from './engine';
import type { RawSticker } from './protocol';
import { STICKER_SIZE } from './types';

const samplePath = process.env.RUSTICKER_SAMPLE_IMAGE;
const EXPECTED_ROWS = [5, 6, 6];

/** Mean color of the 16x16 top-left block, as `0xRRGGBB` (the "picked" background). */
function sampleBackground(data: Uint8Array, width: number): number {
	const sum = [0, 0, 0];
	for (let y = 0; y < 16; y++) {
		for (let x = 0; x < 16; x++) {
			for (let c = 0; c < 3; c++) sum[c] += data[(y * width + x) * 4 + c];
		}
	}
	const [r, g, b] = sum.map((total) => Math.floor(total / 256));
	return (r << 16) | (g << 8) | b;
}

const centerX = ({ bbox: [x, , width] }: RawSticker) => x + width / 2;
const centerY = ({ bbox: [, y, , height] }: RawSticker) => y + height / 2;

describe.skipIf(!samplePath)('sample image through the worker engine (local only)', () => {
	beforeAll(async () => {
		const wasmPath = createRequire(import.meta.url).resolve(
			'rusticker-core/rusticker_core_bg.wasm'
		);
		await init({ module_or_path: readFileSync(wasmPath) });
	});

	it('detects 17 stickers in rows of 5, 6 and 6', () => {
		const image = jpeg.decode(readFileSync(samplePath!), {
			useTArray: true,
			formatAsRGBA: true,
			maxMemoryUsageInMB: 1024
		});
		expect([image.width, image.height]).toEqual([2752, 1536]);
		const rgba = image.data.slice().buffer;

		const result = runDetect({
			rgba,
			width: image.width,
			height: image.height,
			background: sampleBackground(image.data, image.width),
			tolerance: 50
		});

		if (!result.ok) throw new Error(`detection failed: ${result.code} ${result.detail ?? ''}`);
		const { stickers } = result;
		expect(stickers).toHaveLength(17);
		for (const sticker of stickers) {
			expect(sticker.rgba.byteLength).toBe(STICKER_SIZE * STICKER_SIZE * 4);
		}

		const rows: RawSticker[][] = [];
		let start = 0;
		for (const size of EXPECTED_ROWS) {
			rows.push(stickers.slice(start, start + size));
			start += size;
		}
		for (const row of rows) {
			for (let i = 1; i < row.length; i++) {
				expect(centerX(row[i])).toBeGreaterThan(centerX(row[i - 1]));
			}
		}
		for (let r = 1; r < rows.length; r++) {
			const lowestAbove = Math.max(...rows[r - 1].map(centerY));
			const highestBelow = Math.min(...rows[r].map(centerY));
			expect(lowestAbove).toBeLessThan(highestBelow);
		}
	});

	it('reports a core failure code instead of throwing', () => {
		expect(
			runDetect({
				rgba: new ArrayBuffer(399),
				width: 10,
				height: 10,
				background: 0x00ff00,
				tolerance: 50
			})
		).toEqual({ ok: false, code: 'InvalidInput' });
		expect(
			runDetect({
				rgba: new Uint8Array(64 * 64 * 4).fill(0).buffer,
				width: 64,
				height: 64,
				background: 0x000000,
				tolerance: 50
			})
		).toEqual({ ok: false, code: 'NoStickers' });
	});
});
