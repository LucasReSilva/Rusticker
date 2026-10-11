import type { WorkerFailure } from './protocol';
import { DetectionError, type DetectionErrorCode } from './types';

/** The codes the Rust core throws (as plain strings). */
const CORE_CODES: ReadonlySet<string> = new Set<DetectionErrorCode>([
	'NoStickers',
	'ImageTooLarge',
	'InvalidInput'
]);

function describe(thrown: unknown): string {
	if (thrown instanceof Error) return `${thrown.name}: ${thrown.message}`;
	if (typeof thrown === 'string') return `unexpected string: ${thrown}`;
	try {
		return `unexpected value: ${JSON.stringify(thrown)}`;
	} catch {
		return `unexpected value: ${String(thrown)}`;
	}
}

/**
 * Classifies anything thrown by the engine. Core codes (thrown as strings)
 * pass through; anything else (unknown string, non-string, a wasm
 * `RuntimeError` from a Rust panic, an init failure) is `WorkerFailed`.
 */
export function failureFromThrown(thrown: unknown): WorkerFailure {
	if (typeof thrown === 'string' && CORE_CODES.has(thrown)) {
		return { ok: false, code: thrown as DetectionErrorCode };
	}
	return { ok: false, code: 'WorkerFailed', detail: describe(thrown) };
}

/** Builds the `DetectionError` the caller receives for a failed job. */
export function toDetectionError(failure: WorkerFailure): DetectionError {
	return new DetectionError(
		failure.code,
		failure.detail === undefined ? undefined : { cause: failure.detail }
	);
}
