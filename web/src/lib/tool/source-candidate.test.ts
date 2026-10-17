import { expect, it } from 'vitest';
import { extractSourceRectangle, sourceBounds, validSourceBounds } from './source-candidate';

const source = {
	width: 3,
	height: 2,
	data: new Uint8ClampedArray(Array.from({ length: 24 }, (_, index) => index))
} as ImageData;

it('accepts only non-empty integer boxes contained in the source', () => {
	expect(validSourceBounds({ x: 2, y: 1, width: 1, height: 1 }, 3, 2)).toBe(true);
	for (const invalid of [
		{ x: 0, y: 0, width: 0, height: 1 },
		{ x: 0, y: 0, width: 1.5, height: 1 },
		{ x: -1, y: 0, width: 1, height: 1 },
		{ x: 2, y: 0, width: 2, height: 1 }
	]) {
		expect(validSourceBounds(invalid, 3, 2)).toBe(false);
	}
});

it('copies a bounded rectangle without mutating or transferring the source pixels', () => {
	const crop = extractSourceRectangle(source, { x: 1, y: 0, width: 2, height: 2 });
	expect(crop?.width).toBe(2);
	expect(crop?.height).toBe(2);
	expect([...crop!.data]).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23]);
	expect(extractSourceRectangle(source, { x: 3, y: 0, width: 1, height: 1 })).toBeNull();
});

it('maps crop-local bounds back to valid source coordinates', () => {
	expect(
		sourceBounds({ x: 1, y: 2, width: 3, height: 4 }, { x: 5, y: 6, width: 8, height: 9 }, 20, 20)
	).toEqual({
		x: 6,
		y: 8,
		width: 3,
		height: 4
	});
	expect(
		sourceBounds({ x: 7, y: 0, width: 2, height: 1 }, { x: 5, y: 6, width: 8, height: 9 }, 20, 20)
	).toBeNull();
});
