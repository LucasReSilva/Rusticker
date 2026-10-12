// Messages exchanged between the main thread and the detection worker.
import type { DetectionErrorCode } from './types';

/** One detection job, as sent to the worker (the buffer is transferred). */
export interface WorkerRequest {
	/** A private copy of the caller's RGBA pixels. */
	rgba: ArrayBuffer;
	width: number;
	height: number;
	/** Background color as `0xRRGGBB`. */
	background: number;
	/** Integer 0-100. */
	tolerance: number;
}

/** One explicit split-proposal request for an existing 512x512 sticker. */
export interface SplitRequest {
	/** Private copy of the sticker pixels, transferred to the worker. */
	rgba: ArrayBuffer;
}

/** A sticker as produced by the engine: `[x, y, width, height]` + 512x512 RGBA. */
export interface RawSticker {
	bbox: [number, number, number, number];
	rgba: ArrayBuffer;
}

/** A failed job. `detail` is a diagnostic for `WorkerFailed` only. */
export interface WorkerFailure {
	ok: false;
	code: DetectionErrorCode;
	detail?: string;
}

/** A job's outcome. Failures are returned, never thrown, across the boundary. */
export type WorkerResult = { ok: true; stickers: RawSticker[] } | WorkerFailure;

/** The API the worker exposes through Comlink. */
export interface WorkerApi {
	detect(request: WorkerRequest): Promise<WorkerResult>;
	split(request: SplitRequest): Promise<WorkerResult>;
}
