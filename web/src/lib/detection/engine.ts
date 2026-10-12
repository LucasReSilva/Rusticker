// The worker's pure handler around the wasm `detect` (design D2). Kept apart
// from worker.ts so the local integration test can call it in Node.
import { detect, propose_split } from 'rusticker-core';
import { failureFromThrown } from './errors';
import type { RawSticker, SplitRequest, WorkerRequest, WorkerResult } from './protocol';

/** An `ArrayBuffer` holding exactly `bytes`, without copying when possible. */
function ownBuffer(bytes: Uint8Array): ArrayBuffer {
	if (
		bytes.byteOffset === 0 &&
		bytes.byteLength === bytes.buffer.byteLength &&
		bytes.buffer instanceof ArrayBuffer
	) {
		return bytes.buffer;
	}
	return bytes.slice().buffer;
}

/**
 * Runs detection on one request. The wasm module must already be
 * initialized. Never throws: failures come back as `{ ok: false, code }`.
 * The native result is always freed, even when reading a sticker fails.
 */
export function runDetect(request: WorkerRequest): WorkerResult {
	try {
		const detection = detect(
			new Uint8Array(request.rgba),
			request.width,
			request.height,
			request.background,
			request.tolerance
		);
		try {
			const stickers: RawSticker[] = [];
			for (let index = 0; index < detection.count; index++) {
				const [x, y, width, height] = detection.bbox(index);
				// rgba() returns a fresh JS-owned copy, not a view into wasm memory.
				stickers.push({ bbox: [x, y, width, height], rgba: ownBuffer(detection.rgba(index)) });
			}
			return { ok: true, stickers };
		} finally {
			detection.free();
		}
	} catch (thrown) {
		return failureFromThrown(thrown);
	}
}

/** Runs an explicit bounded split proposal for one already detected sticker. */
export function runSplit(request: SplitRequest): WorkerResult {
	try {
		const proposal = propose_split(new Uint8Array(request.rgba));
		try {
			const stickers: RawSticker[] = [];
			for (let index = 0; index < proposal.count; index++) {
				const [x, y, width, height] = proposal.bbox(index);
				stickers.push({ bbox: [x, y, width, height], rgba: ownBuffer(proposal.rgba(index)) });
			}
			return { ok: true, stickers };
		} finally {
			proposal.free();
		}
	} catch (thrown) {
		return failureFromThrown(thrown);
	}
}

/** The buffers of a result, to transfer them back without copying. */
export function transferables(result: WorkerResult): ArrayBuffer[] {
	return result.ok ? result.stickers.map((sticker) => sticker.rgba) : [];
}
