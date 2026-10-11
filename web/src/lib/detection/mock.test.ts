import { describe, expect, it } from 'vitest';
import { createMockDetector } from './mock';
import { DetectionError, isCancelled, STICKER_SIZE, type DetectInput } from './types';

const options = { background: { r: 0, g: 255, b: 0 }, tolerance: 50 };

function image(width: number, height: number): DetectInput {
	return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

// Typed-array deep equality in vitest is slow for 1 MiB images.
function sameBytes(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (error) {
		return error instanceof DetectionError ? error.code : 'other';
	}
	return undefined;
}

describe('createMockDetector', () => {
	it('returns 6 ordered 512x512 stickers by default', async () => {
		const stickers = await createMockDetector().detect(image(300, 200), options);
		expect(stickers).toHaveLength(6);
		stickers.forEach((sticker, position) => {
			expect(sticker.index).toBe(position);
			expect(sticker.pixels.width).toBe(STICKER_SIZE);
			expect(sticker.pixels.height).toBe(STICKER_SIZE);
			expect(sticker.pixels.data).toHaveLength(STICKER_SIZE * STICKER_SIZE * 4);
		});
		// Reading order: rows top to bottom, left to right within a row.
		const boxes = stickers.map((sticker) => sticker.bbox);
		for (let i = 1; i < boxes.length; i++) {
			const sameRow = boxes[i].y === boxes[i - 1].y;
			expect(sameRow ? boxes[i].x > boxes[i - 1].x : boxes[i].y > boxes[i - 1].y).toBe(true);
		}
	});

	it('is deterministic for the same input', async () => {
		const detector = createMockDetector({ count: 4 });
		const first = await detector.detect(image(640, 480), options);
		const second = await detector.detect(image(640, 480), options);
		expect(second.map((s) => s.bbox)).toEqual(first.map((s) => s.bbox));
		second.forEach((sticker, index) => {
			expect(sameBytes(sticker.pixels.data, first[index].pixels.data)).toBe(true);
		});
	});

	it('has a transparent background and an opaque circle', async () => {
		const [sticker] = await createMockDetector({ count: 1 }).detect(image(100, 100), options);
		const alpha = (x: number, y: number) => sticker.pixels.data[(y * STICKER_SIZE + x) * 4 + 3];
		expect(alpha(0, 0)).toBe(0);
		expect(alpha(256, 256)).toBe(255);
	});

	it('gives unique ids across detections', async () => {
		const detector = createMockDetector();
		const first = await detector.detect(image(300, 200), options);
		const second = await detector.detect(image(300, 200), options);
		const ids = new Set(first.map((s) => s.id));
		expect(second.some((s) => ids.has(s.id))).toBe(false);
		expect(new Set(second.map((s) => s.id)).size).toBe(second.length);
	});

	it('fails with the configured code', async () => {
		const detector = createMockDetector({ failWith: 'NoStickers' });
		expect(await codeOf(detector.detect(image(10, 10), options))).toBe('NoStickers');
	});

	it('rejects invalid options and shapes like the real detector', async () => {
		const detector = createMockDetector();
		expect(await codeOf(detector.detect(image(10, 10), { ...options, tolerance: 101 }))).toBe(
			'InvalidInput'
		);
		expect(
			await codeOf(
				detector.detect(image(10, 10), { ...options, background: { r: 0, g: 300, b: 0 } })
			)
		).toBe('InvalidInput');
		expect(await codeOf(detector.detect(image(0, 10), options))).toBe('InvalidInput');
		expect(
			await codeOf(
				detector.detect({ data: new Uint8ClampedArray(399), width: 10, height: 10 }, options)
			)
		).toBe('InvalidInput');
		expect(
			await codeOf(
				detector.detect({ data: new Uint8ClampedArray(4), width: 8193, height: 1 }, options)
			)
		).toBe('ImageTooLarge');
	});

	it('cancels superseded requests', async () => {
		const detector = createMockDetector({ delayMs: 20 });
		const first = detector.detect(image(30, 30), options);
		const second = detector.detect(image(30, 30), options);
		const third = detector.detect(image(30, 30), { ...options, tolerance: 10 });
		await expect(first).rejects.toSatisfy(isCancelled);
		await expect(second).rejects.toSatisfy(isCancelled);
		await expect(third).resolves.toHaveLength(6);
	});

	it('fails with WorkerFailed after dispose and cancels pending work', async () => {
		const detector = createMockDetector({ delayMs: 20 });
		const pending = detector.detect(image(30, 30), options);
		detector.dispose();
		await expect(pending).rejects.toSatisfy(isCancelled);
		expect(await codeOf(detector.detect(image(30, 30), options))).toBe('WorkerFailed');
	});

	it('keeps the caller image intact', async () => {
		const input = image(20, 20);
		input.data.fill(7);
		await createMockDetector().detect(input, options);
		expect(input.data.every((value) => value === 7)).toBe(true);
	});
});
