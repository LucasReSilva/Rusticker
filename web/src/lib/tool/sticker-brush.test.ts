import { describe, expect, it } from 'vitest';
import type { BBox } from '$lib/detection';
import { applyBrushStroke, type BrushStroke } from './sticker-brush';

function image(width: number, height: number, rgba = [0, 0, 0, 0]): ImageData {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let offset = 0; offset < data.length; offset += 4) data.set(rgba, offset);
	return { width, height, data } as ImageData;
}

function pixel(image: ImageData, x: number, y: number): number[] {
	const offset = (y * image.width + x) * 4;
	return Array.from(image.data.slice(offset, offset + 4));
}

const bounds = { x: 0, y: 0, width: 4, height: 4 };
const stroke: BrushStroke = { mode: 'erase', size: 10, points: [{ x: 256.5, y: 256.5 }] };

describe('applyBrushStroke', () => {
	it('erases a circular footprint to transparent black and leaves nearby pixels intact', () => {
		const current = image(512, 512, [200, 80, 20, 255]);
		const result = applyBrushStroke(current, image(4, 4), bounds, stroke)!;

		expect(pixel(result, 256, 256)).toEqual([0, 0, 0, 0]);
		expect(pixel(result, 261, 256)).toEqual([0, 0, 0, 0]);
		expect(pixel(result, 261, 261)).toEqual([200, 80, 20, 255]);
		expect(pixel(result, 262, 256)).toEqual([200, 80, 20, 255]);
	});

	it('fills horizontal and diagonal paths between widely spaced pointer samples', () => {
		const current = image(512, 512, [1, 2, 3, 255]);
		const result = applyBrushStroke(current, image(4, 4), bounds, {
			mode: 'erase',
			size: 3,
			points: [
				{ x: 40.5, y: 40.5 },
				{ x: 240.5, y: 40.5 },
				{ x: 440.5, y: 240.5 }
			]
		})!;

		for (let step = 0; step <= 200; step++) {
			expect(pixel(result, 40 + step, 40)[3]).toBe(0);
			expect(pixel(result, 240 + step, 40 + step)[3]).toBe(0);
		}
		expect(pixel(result, 140, 45)[3]).toBe(255);
	});

	it.each([
		{ bounds: { x: 2, y: 1, width: 4, height: 2 }, frame: { x: 16, y: 136, w: 480, h: 240 } },
		{ bounds: { x: 1, y: 2, width: 2, height: 4 }, frame: { x: 136, y: 16, w: 240, h: 480 } },
		{ bounds: { x: 1, y: 1, width: 3, height: 7 }, frame: { x: 153, y: 16, w: 206, h: 480 } },
		{ bounds: { x: 1, y: 1, width: 7, height: 3 }, frame: { x: 16, y: 153, w: 480, h: 206 } }
	])(
		'restores exact crop RGBA and preserves aspect-fit padding for $bounds',
		({ bounds, frame }) => {
			const source = image(10, 10);
			for (let y = 0; y < source.height; y++) {
				for (let x = 0; x < source.width; x++) {
					source.data.set([x * 20, y * 20, 99, (x + y) % 2 === 0 ? 0 : 83], (y * 10 + x) * 4);
				}
			}
			const result = applyBrushStroke(image(512, 512), source, bounds, {
				mode: 'restore',
				size: 1024,
				points: [{ x: 256, y: 256 }]
			})!;

			for (const [x, y] of [
				[frame.x, frame.y],
				[frame.x + frame.w - 1, frame.y + frame.h - 1],
				[256, 256],
				[frame.x + Math.floor(frame.w / 3), frame.y + Math.floor(frame.h / 3)]
			]) {
				const sourceX = bounds.x + Math.floor(((x - frame.x + 0.5) * bounds.width) / frame.w);
				const sourceY = bounds.y + Math.floor(((y - frame.y + 0.5) * bounds.height) / frame.h);
				expect(pixel(result, x, y)).toEqual(pixel(source, sourceX, sourceY));
			}
			expect(pixel(result, frame.x - 1, frame.y)).toEqual([0, 0, 0, 0]);
			expect(pixel(result, frame.x, frame.y - 1)).toEqual([0, 0, 0, 0]);
			expect(pixel(result, frame.x + frame.w, frame.y)).toEqual([0, 0, 0, 0]);
			expect(pixel(result, frame.x, frame.y + frame.h)).toEqual([0, 0, 0, 0]);
		}
	);

	it('clips both modes to the crop even when a path extends outside the sticker', () => {
		for (const mode of ['erase', 'restore'] as const) {
			const result = applyBrushStroke(image(512, 512, [1, 2, 3, 255]), image(4, 4), bounds, {
				mode,
				size: 1024,
				points: [
					{ x: -100, y: 256 },
					{ x: 700, y: 256 }
				]
			})!;
			expect(pixel(result, 16, 16)).toEqual([0, 0, 0, 0]);
			expect(pixel(result, 15, 256)).toEqual([1, 2, 3, 255]);
			expect(pixel(result, 496, 256)).toEqual([1, 2, 3, 255]);
		}
	});

	it('does not mutate either image, the bounds, or the stroke', () => {
		const current = image(512, 512, [200, 80, 20, 255]);
		const source = image(4, 4, [100, 50, 25, 83]);
		const beforeCurrent = current.data.slice();
		const beforeSource = source.data.slice();
		const frozenBounds = Object.freeze({ ...bounds });
		const frozenStroke = Object.freeze({
			...stroke,
			points: Object.freeze(stroke.points.map((point) => Object.freeze({ ...point })))
		});
		for (const mode of ['erase', 'restore'] as const) {
			const result = applyBrushStroke(current, source, frozenBounds, { ...frozenStroke, mode })!;
			expect(result).not.toBe(current);
			expect(result.data.buffer).not.toBe(current.data.buffer);
			expect(current.data.every((channel, index) => channel === beforeCurrent[index])).toBe(true);
			expect(source.data).toEqual(beforeSource);
		}
	});

	it.each([
		{ ...stroke, mode: 'paint' },
		{ ...stroke, size: 0 },
		{ ...stroke, size: -1 },
		{ ...stroke, size: Number.NaN },
		{ ...stroke, size: Number.POSITIVE_INFINITY },
		{ ...stroke, points: [] },
		{ ...stroke, points: new Array(1) },
		{ ...stroke, points: null },
		{ ...stroke, points: [null] },
		{ ...stroke, points: [{ x: Number.NaN, y: 0 }] },
		{ ...stroke, points: [{ x: 0, y: Number.POSITIVE_INFINITY }] },
		{ ...stroke, points: [{ x: Number.MAX_VALUE, y: 0 }] },
		null
	])('rejects malformed strokes %o', (invalid) => {
		expect(
			applyBrushStroke(image(512, 512), image(4, 4), bounds, invalid as BrushStroke)
		).toBeNull();
	});

	it.each([
		{ x: -1, y: 0, width: 4, height: 4 },
		{ x: 0, y: -1, width: 4, height: 4 },
		{ x: 0, y: 0, width: 0, height: 4 },
		{ x: 0, y: 0, width: 4, height: -1 },
		{ x: 1, y: 0, width: 4, height: 4 },
		{ x: 0, y: 1, width: 4, height: 4 },
		{ x: 0.5, y: 0, width: 3, height: 4 },
		{ x: 0, y: 0, width: Number.NaN, height: 4 },
		null
	])('rejects malformed or out-of-source bounds %o', (invalid) => {
		expect(applyBrushStroke(image(512, 512), image(4, 4), invalid as BBox, stroke)).toBeNull();
	});

	it('rejects mismatched dimensions, buffer lengths, and channel storage', () => {
		for (const invalid of [
			image(1, 1),
			{ width: 512, height: 512, data: new Uint8ClampedArray(4) },
			{ width: 512, height: 512, data: new Uint8Array(512 * 512 * 4) },
			null
		]) {
			expect(applyBrushStroke(invalid as ImageData, image(4, 4), bounds, stroke)).toBeNull();
		}
		for (const invalid of [
			{ width: 4, height: 4, data: new Uint8ClampedArray(4) },
			{ width: 0, height: 4, data: new Uint8ClampedArray(0) },
			{ width: 0.5, height: 4, data: new Uint8ClampedArray(8) },
			null
		]) {
			expect(applyBrushStroke(image(512, 512), invalid as ImageData, bounds, stroke)).toBeNull();
		}
	});
});
