import { describe, expect, it } from 'vitest';
import { failureFromThrown, toDetectionError } from './errors';
import { DetectionError } from './types';

describe('failureFromThrown', () => {
	it.each(['NoStickers', 'ImageTooLarge', 'InvalidInput'] as const)(
		'passes the core code %s through',
		(code) => {
			expect(failureFromThrown(code)).toEqual({ ok: false, code });
		}
	);

	it('maps an unknown string to WorkerFailed', () => {
		const failure = failureFromThrown('Boom');
		expect(failure.code).toBe('WorkerFailed');
		expect(failure.detail).toContain('Boom');
	});

	it('does not treat WorkerFailed thrown by the engine as a core code', () => {
		expect(failureFromThrown('WorkerFailed').detail).toBeDefined();
	});

	it('maps non-string values to WorkerFailed', () => {
		expect(failureFromThrown(42).code).toBe('WorkerFailed');
		expect(failureFromThrown(undefined).code).toBe('WorkerFailed');
		expect(failureFromThrown({ code: 'NoStickers' }).code).toBe('WorkerFailed');
	});

	it('maps a wasm RuntimeError (Rust panic) to WorkerFailed', () => {
		const failure = failureFromThrown(new WebAssembly.RuntimeError('unreachable'));
		expect(failure.code).toBe('WorkerFailed');
		expect(failure.detail).toContain('RuntimeError');
	});

	it('maps an init failure to WorkerFailed', () => {
		const failure = failureFromThrown(new TypeError('Failed to fetch'));
		expect(failure).toMatchObject({ ok: false, code: 'WorkerFailed' });
	});
});

describe('toDetectionError', () => {
	it('builds a DetectionError whose message is the code', () => {
		const error = toDetectionError({ ok: false, code: 'NoStickers' });
		expect(error).toBeInstanceOf(DetectionError);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('DetectionError');
		expect(error.code).toBe('NoStickers');
		expect(error.message).toBe('NoStickers');
		expect(error.cause).toBeUndefined();
	});

	it('keeps the worker detail as the cause', () => {
		const error = toDetectionError({ ok: false, code: 'WorkerFailed', detail: 'RuntimeError: x' });
		expect(error.code).toBe('WorkerFailed');
		expect(error.cause).toBe('RuntimeError: x');
	});
});
