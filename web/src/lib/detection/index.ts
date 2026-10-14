// Real detector: runs the Rust core in a module Web Worker (design D2-D5).
// Importing this module never touches `Worker`; only createDetector() does,
// so it is safe to import from prerendered code (call it in the browser only).
import * as Comlink from 'comlink';
import type {
	SplitRequest,
	WorkerApi,
	WorkerFailure,
	WorkerRequest,
	WorkerResult
} from './protocol';
import { createRuntime, type Job } from './runtime';
import type { Detector } from './types';

export * from './types';
export { createMockDetector, type MockDetectorConfig } from './mock';
export { detectionErrorMessage } from './messages';

interface Engine {
	worker: Worker;
	api: Comlink.Remote<WorkerApi>;
	/** Resolves with a `WorkerFailed` result when the worker reports an error. */
	crashed: Promise<WorkerFailure>;
}

function spawnEngine(): Engine {
	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	const crashed = new Promise<WorkerFailure>((resolve) => {
		worker.addEventListener('error', (event) => {
			event.preventDefault();
			resolve({ ok: false, code: 'WorkerFailed', detail: `worker error: ${event.message}` });
		});
		worker.addEventListener('messageerror', () => {
			resolve({ ok: false, code: 'WorkerFailed', detail: 'worker messageerror' });
		});
	});
	return { worker, api: Comlink.wrap<WorkerApi>(worker), crashed };
}

/**
 * Creates a detector backed by its own worker. The worker (and the wasm
 * download/compile) starts right away so it overlaps with the user choosing
 * a file. After a `WorkerFailed` failure the worker is discarded and a fresh
 * one is created on the next request.
 */
export function createDetector(): Detector {
	let engine: Engine | null = spawnEngine();

	const recycle = (failed: Engine) => {
		failed.api[Comlink.releaseProxy]();
		failed.worker.terminate();
		if (engine === failed) engine = null;
	};

	const execute = async (job: Job): Promise<WorkerResult> => {
		const current = (engine ??= spawnEngine());
		// One defensive copy keeps the caller's ImageData intact (design D3).
		const rgba = job.image.data.slice().buffer;
		const request: WorkerRequest = {
			rgba,
			width: job.image.width,
			height: job.image.height,
			background: job.background,
			tolerance: job.tolerance
		};
		let result: WorkerResult;
		try {
			result = await Promise.race([
				current.api.detect(Comlink.transfer(request, [rgba])),
				current.crashed
			]);
		} catch (thrown) {
			result = {
				ok: false,
				code: 'WorkerFailed',
				detail: thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown)
			};
		}
		// A failed or panicked wasm instance must not be reused.
		if (!result.ok && result.code === 'WorkerFailed') recycle(current);
		return result;
	};
	const propose = async (image: import('./types').DetectInput): Promise<WorkerResult> => {
		const current = (engine ??= spawnEngine());
		const rgba = image.data.slice().buffer;
		const request: SplitRequest = { rgba };
		let result: WorkerResult;
		try {
			result = await Promise.race([
				current.api.split(Comlink.transfer(request, [rgba])),
				current.crashed
			]);
		} catch (thrown) {
			result = {
				ok: false,
				code: 'WorkerFailed',
				detail: thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown)
			};
		}
		if (!result.ok && result.code === 'WorkerFailed') recycle(current);
		return result;
	};

	return createRuntime(
		execute,
		() => {
			if (engine !== null) recycle(engine);
		},
		propose
	);
}
