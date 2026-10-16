import { expect, it } from 'vitest';
import { editCropBounds, nextZoom, sourceDelta } from './inspector';

it('steps through bounded zoom levels', () => {
	expect(nextZoom(1, -1)).toBe(1);
	expect(nextZoom(1, 1)).toBe(2);
	expect(nextZoom(8, 1)).toBe(8);
});

it('maps displayed pointer motion to source pixels regardless of zoom', () => {
	expect(sourceDelta(12, 600, 1200)).toBe(24);
	expect(sourceDelta(24, 1200, 1200)).toBe(24);
	expect(sourceDelta(10, 0, 1200)).toBe(0);
});

it('moves and resizes integer crop bounds without leaving the source image', () => {
	const initial = { x: 10, y: 10, width: 20, height: 20 };
	expect(editCropBounds(initial, 'move', -20, 100, 40, 40)).toEqual({
		x: 0,
		y: 20,
		width: 20,
		height: 20
	});
	expect(editCropBounds(initial, 'nw', 25, -50, 40, 40)).toEqual({
		x: 29,
		y: 0,
		width: 1,
		height: 30
	});
	expect(editCropBounds(initial, 'se', 100, 100, 40, 40)).toEqual({
		x: 10,
		y: 10,
		width: 30,
		height: 30
	});
});
