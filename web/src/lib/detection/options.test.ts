import { describe, expect, it } from 'vitest';
import { toEngineOptions } from './options';
import { DetectionError } from './types';

const green = { r: 0, g: 255, b: 0 };

function codeOf(run: () => unknown): string | undefined {
	try {
		run();
	} catch (error) {
		return error instanceof DetectionError ? error.code : 'other';
	}
	return undefined;
}

describe('toEngineOptions', () => {
	it('packs the background as 0xRRGGBB', () => {
		expect(toEngineOptions({ background: green, tolerance: 50 })).toEqual({
			background: 0x00ff00,
			tolerance: 50
		});
		expect(toEngineOptions({ background: { r: 0x12, g: 0x34, b: 0x56 }, tolerance: 0 })).toEqual({
			background: 0x123456,
			tolerance: 0
		});
		expect(toEngineOptions({ background: { r: 255, g: 255, b: 255 }, tolerance: 100 })).toEqual({
			background: 0xffffff,
			tolerance: 100
		});
	});

	it('rounds the tolerance to the nearest integer', () => {
		expect(toEngineOptions({ background: green, tolerance: 49.5 }).tolerance).toBe(50);
		expect(toEngineOptions({ background: green, tolerance: 100.4 }).tolerance).toBe(100);
		expect(toEngineOptions({ background: green, tolerance: -0.4 }).tolerance).toBe(0);
	});

	it.each([
		{ r: -1, g: 0, b: 0 },
		{ r: 0, g: 256, b: 0 },
		{ r: 0, g: 0, b: 1.5 },
		{ r: 0, g: 0, b: Number.NaN }
	])('rejects the channel set %o with InvalidInput', (background) => {
		expect(codeOf(() => toEngineOptions({ background, tolerance: 50 }))).toBe('InvalidInput');
	});

	it.each([100.5, 101, -0.6, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects tolerance %d with InvalidInput',
		(tolerance) => {
			expect(codeOf(() => toEngineOptions({ background: green, tolerance }))).toBe('InvalidInput');
		}
	);
});
