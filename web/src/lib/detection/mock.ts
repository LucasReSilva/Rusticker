// Deterministic test double for the detector (design D7). Same request,
// result, cancellation, and error semantics as createDetector(), without the
// compiled wasm engine. For tests of the tool UI and the WhatsApp export.
import type { RawSticker, WorkerResult } from './protocol';
import { createRuntime, type Job } from './runtime';
import { STICKER_SIZE, type DetectionErrorCode, type Detector } from './types';

export interface MockDetectorConfig {
	/** Number of synthetic stickers per successful request (default 6). */
	count?: number;
	/** When set, every request fails with this code. */
	failWith?: DetectionErrorCode;
	/** Simulated processing time per request, in milliseconds (default 0). */
	delayMs?: number;
}

/** Fixed sticker colors, cycled by index. */
const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
	[230, 57, 70],
	[29, 53, 87],
	[69, 123, 157],
	[244, 162, 97],
	[42, 157, 143],
	[131, 56, 236]
];

const COLUMNS = 3;
const MAX_SIDE = 8192;
const MAX_PIXELS = 40_000_000;

/** The core's image-shape checks, in the core's order. */
function shapeError(job: Job): DetectionErrorCode | undefined {
	const { width, height, data } = job.image;
	if (width === 0 || height === 0) return 'InvalidInput';
	if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) return 'ImageTooLarge';
	if (data.length !== width * height * 4) return 'InvalidInput';
	return undefined;
}

/** A 512x512 transparent image with an opaque, index-colored circle. */
function circleImage(index: number): ArrayBuffer {
	const [r, g, b] = PALETTE[index % PALETTE.length];
	const pixels = new Uint8Array(STICKER_SIZE * STICKER_SIZE * 4);
	const center = STICKER_SIZE / 2;
	const radius = 240;
	for (let y = 0; y < STICKER_SIZE; y++) {
		for (let x = 0; x < STICKER_SIZE; x++) {
			const dx = x + 0.5 - center;
			const dy = y + 0.5 - center;
			if (dx * dx + dy * dy <= radius * radius) {
				const offset = (y * STICKER_SIZE + x) * 4;
				pixels[offset] = r;
				pixels[offset + 1] = g;
				pixels[offset + 2] = b;
				pixels[offset + 3] = 255;
			}
		}
	}
	return pixels.buffer;
}

/** `count` boxes in a grid of up to 3 per row over the image, in reading order. */
function layout(count: number, width: number, height: number): RawSticker['bbox'][] {
	const columns = Math.min(COLUMNS, count);
	const rows = Math.ceil(count / COLUMNS);
	const cellWidth = Math.floor(width / columns);
	const cellHeight = Math.floor(height / rows);
	return Array.from({ length: count }, (_, index) => {
		const column = index % COLUMNS;
		const row = Math.floor(index / COLUMNS);
		return [
			column * cellWidth + Math.floor(cellWidth / 4),
			row * cellHeight + Math.floor(cellHeight / 4),
			Math.max(1, Math.floor(cellWidth / 2)),
			Math.max(1, Math.floor(cellHeight / 2))
		];
	});
}

/** Creates a detector that returns synthetic stickers depending only on its config and the image size. */
export function createMockDetector(config: MockDetectorConfig = {}): Detector {
	const { count = 6, failWith, delayMs = 0 } = config;

	const execute = async (job: Job): Promise<WorkerResult> => {
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
		if (failWith !== undefined) return { ok: false, code: failWith };
		const invalid = shapeError(job);
		if (invalid !== undefined) return { ok: false, code: invalid };
		if (count <= 0) return { ok: false, code: 'NoStickers' };
		const boxes = layout(count, job.image.width, job.image.height);
		return { ok: true, stickers: boxes.map((bbox, index) => ({ bbox, rgba: circleImage(index) })) };
	};

	return createRuntime(execute);
}
