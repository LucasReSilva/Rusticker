import { describe, expect, it } from 'vitest';
import type { Sticker } from '$lib/detection';
import { adjustStickerBounds } from './bounds';

function sticker(bounds = { x: 10, y: 10, width: 100, height: 100 }): Sticker {
	const data = new Uint8ClampedArray(512 * 512 * 4);
	for (let y = 16; y < 496; y++) {
		for (let x = 16; x < 496; x++) {
			const offset = (y * 512 + x) * 4;
			data.set([220, 40, 10, 255], offset);
		}
	}
	return {
		id: 'sticker-1',
		index: 2,
		bbox: bounds,
		pixels: { width: 512, height: 512, data } as ImageData
	};
}

describe('adjustStickerBounds', () => {
	it('returns the original sticker when its bounds are unchanged', () => {
		const original = sticker();
		expect(adjustStickerBounds(original, original.bbox, 200, 200)).toBe(original);
	});

	it('updates source bounds and reframes pixels within the 512 frame', () => {
		const original = sticker();
		const result = adjustStickerBounds(original, { x: 20, y: 30, width: 50, height: 25 }, 200, 200);

		expect(result?.bbox).toEqual({ x: 20, y: 30, width: 50, height: 25 });
		expect(result?.id).toBe(original.id);
		expect(result?.index).toBe(original.index);
		expect(result?.pixels).not.toBe(original.pixels);
		const pixels = result!.pixels.data;
		expect(pixels[(136 * 512 + 16) * 4 + 3]).toBe(255);
		expect(pixels[(136 * 512 + 16) * 4]).toBe(220);
		expect(pixels[(136 * 512 + 15) * 4 + 3]).toBe(0);
	});

	it('keeps areas outside the original cut-out transparent when expanding bounds', () => {
		const original = sticker({ x: 20, y: 20, width: 80, height: 80 });
		const result = adjustStickerBounds(
			original,
			{ x: 10, y: 10, width: 100, height: 100 },
			200,
			200
		);

		expect(result?.bbox).toEqual({ x: 10, y: 10, width: 100, height: 100 });
		expect(result!.pixels.data[(16 * 512 + 16) * 4 + 3]).toBe(0);
		expect(result!.pixels.data[(256 * 512 + 256) * 4 + 3]).toBe(255);
	});

	it.each([
		[{ x: 0, y: 0, width: 0, height: 2 }, 100, 100],
		[{ x: 0, y: 0, width: 1, height: 1 }, 0, 100],
		[{ x: -1, y: 0, width: 2, height: 2 }, 100, 100],
		[{ x: 99, y: 0, width: 2, height: 2 }, 100, 100],
		[{ x: 0.5, y: 0, width: 2, height: 2 }, 100, 100],
		[{ x: 0, y: 0, width: Number.NaN, height: 2 }, 100, 100]
	] as const)('rejects invalid or out-of-image bounds %o', (bounds, width, height) => {
		expect(adjustStickerBounds(sticker(), bounds, width, height)).toBeNull();
	});

	it('rejects a malformed cut-out rather than returning a partial sticker', () => {
		const original = sticker();
		original.pixels = { width: 1, height: 1, data: new Uint8ClampedArray(4) } as ImageData;
		expect(
			adjustStickerBounds(original, { x: 10, y: 10, width: 20, height: 20 }, 200, 200)
		).toBeNull();
	});

	it('writes fully transparent samples as transparent black', () => {
		const original = sticker();
		const result = adjustStickerBounds(
			original,
			{ x: 0, y: 0, width: 100, height: 100 },
			200,
			200
		)!;
		const offset = (16 * 512 + 16) * 4;
		expect(Array.from(result.pixels.data.slice(offset, offset + 4))).toEqual([0, 0, 0, 0]);
	});
});
