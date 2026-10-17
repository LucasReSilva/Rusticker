import { describe, expect, it, vi } from 'vitest';
import {
	extractRgbTile,
	ONNX_SCALE,
	ONNX_TILE_SIZE,
	tileRegions,
	tileStarts,
	upscaleRgbWithSession,
	validateOnnxContract,
	validateTileOutput,
	OnnxModelFailure
} from './onnx-model';
import type { OnnxSession } from './onnx-runtime';

function session(overrides: Partial<OnnxSession> = {}): OnnxSession {
	return {
		inputNames: ['input'],
		outputNames: ['output'],
		inputMetadata: [{ type: 'float32', dimensions: [1, 3, 'height', 'width'] }],
		outputMetadata: [{ type: 'float32', dimensions: [1, 3, 'out_height', 'out_width'] }],
		run: vi.fn(async () => ({
			output: {
				dims: [1, 3, ONNX_TILE_SIZE * ONNX_SCALE, ONNX_TILE_SIZE * ONNX_SCALE],
				data: new Float32Array(3 * (ONNX_TILE_SIZE * ONNX_SCALE) ** 2).fill(0.5)
			}
		})),
		release: vi.fn(async () => {}),
		...overrides
	};
}

describe('ONNX tile contract', () => {
	it('accepts one dynamic NCHW float RGB x4 input/output graph', () => {
		expect(() => validateOnnxContract(session())).not.toThrow();
		expect(() =>
			validateOnnxContract(
				session({ inputMetadata: [{ type: 'float32', dimensions: [1, 3, 64, 64] }] })
			)
		).toThrow(OnnxModelFailure);
	});

	it.each([1, 63, 64, 65, 100, 129])(
		'covers each source pixel for width %i without gaps',
		(width) => {
			const coverage = new Uint8Array(width);
			for (const region of tileRegions(width)) {
				for (let x = region.outputStart; x < region.outputStart + region.length; x++) coverage[x]++;
			}
			expect(coverage.every((count) => count === 1)).toBe(true);
			expect(tileStarts(width)[0]).toBe(0);
		}
	);

	it('normalizes RGB channels and extends edge pixels to fill a tile', () => {
		const rgba = new Uint8ClampedArray([255, 128, 0, 0, 0, 64, 255, 255]);
		const tile = extractRgbTile(rgba, 2, 1, 0, 0);
		const plane = ONNX_TILE_SIZE ** 2;
		expect(tile[0]).toBe(1);
		expect(tile[plane]).toBeCloseTo(128 / 255);
		expect(tile[2 * plane]).toBe(0);
		expect(tile[1]).toBe(0);
		expect(tile[plane + 1]).toBeCloseTo(64 / 255);
		expect(tile[2 * plane + 1]).toBe(1);
	});

	it('rejects malformed output dimensions and non-finite model values', () => {
		expect(() => validateTileOutput({ dims: [1, 3, 64, 64], data: [] })).toThrow(OnnxModelFailure);
		const data = new Float32Array(3 * (ONNX_TILE_SIZE * ONNX_SCALE) ** 2);
		data[4] = Number.NaN;
		expect(() =>
			validateTileOutput({
				dims: [1, 3, ONNX_TILE_SIZE * ONNX_SCALE, ONNX_TILE_SIZE * ONNX_SCALE],
				data
			})
		).toThrow(OnnxModelFailure);
	});

	it('runs sequential tiles and reports progress with x4 output dimensions', async () => {
		const active = session();
		const progress = vi.fn();
		const result = await upscaleRgbWithSession(
			active,
			new Uint8ClampedArray(65 * 2 * 4),
			{ width: 65, height: 2 },
			progress
		);
		expect(result.length).toBe(65 * 4 * 2 * 4 * 4);
		expect(active.run).toHaveBeenCalledTimes(2);
		expect(progress).toHaveBeenLastCalledWith(2, 2);
		expect(result[3]).toBe(255);
	});
});
