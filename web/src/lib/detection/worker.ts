// Module Web Worker that runs the Rust core (design D1/D2). Created by
// createDetector() in ./index.ts; one wasm instance per worker.
import * as Comlink from 'comlink';
import init from 'rusticker-core';
// A `?url` import makes Vite emit the binary as a hashed asset whose URL
// respects the configured base path (e.g. /Rusticker on GitHub Pages).
import wasmUrl from 'rusticker-core/rusticker_core_bg.wasm?url';
import { runDetect, runSplit, transferables } from './engine';
import { failureFromThrown } from './errors';
import type { SplitRequest, WorkerApi, WorkerRequest, WorkerResult } from './protocol';

// Started once, when the worker module is evaluated; every job awaits it.
const ready = init({ module_or_path: wasmUrl });
// Handled per job below; avoid an unhandled-rejection event meanwhile.
ready.catch(() => {});

const api: WorkerApi = {
	async detect(request: WorkerRequest): Promise<WorkerResult> {
		try {
			await ready;
		} catch (thrown) {
			return failureFromThrown(thrown);
		}
		const result = runDetect(request);
		return Comlink.transfer(result, transferables(result));
	},
	async split(request: SplitRequest): Promise<WorkerResult> {
		try {
			await ready;
		} catch (thrown) {
			return failureFromThrown(thrown);
		}
		const result = runSplit(request);
		return Comlink.transfer(result, transferables(result));
	}
};

Comlink.expose(api);
