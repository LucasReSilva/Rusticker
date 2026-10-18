import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewInWorker, upscaleInWorker } from './process';

class FakeWorker {
	static instances: FakeWorker[] = [];
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	terminated = false;
	terminateCalls = 0;
	posted: unknown;
	constructor() {
		FakeWorker.instances.push(this);
	}
	postMessage(message: unknown) {
		this.posted = message;
	}
	terminate() {
		this.terminated = true;
		this.terminateCalls++;
	}
	emit(data: unknown) {
		this.onmessage?.({ data } as MessageEvent);
	}
	fail(message: string) {
		this.onerror?.({ message } as ErrorEvent);
	}
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	FakeWorker.instances = [];
});

describe('upscaling worker lifecycle', () => {
	it('returns a worker-generated source preview and dimensions', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const file = new File(['image'], 'image.png');
		const expected = { width: 40, height: 20 };
		const job = previewInWorker(file, expected);
		const worker = FakeWorker.instances[0];
		expect(worker.posted).toMatchObject({ type: 'preview', file, expected });
		const blob = new Blob(['preview'], { type: 'image/png' });
		worker.emit({ type: 'preview', blob, source: { width: 40, height: 20 } });
		expect(await job.result).toEqual({ blob, source: { width: 40, height: 20 } });
		expect(worker.terminated).toBe(true);
		expect(worker.terminateCalls).toBe(1);
		job.cancel();
		expect(worker.terminateCalls).toBe(1);
	});

	it('reports processing stages and terminates after returning the PNG', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const progress = vi.fn();
		const dimensions = vi.fn();
		const tileProgress = vi.fn();
		const callbackOrder: string[] = [];
		const file = new File(['image'], 'image.png');
		const expected = { width: 40, height: 20 };
		const job = upscaleInWorker(
			file,
			expected,
			2,
			(stage) => {
				callbackOrder.push(`progress:${stage}`);
				progress(stage);
			},
			(source, output) => {
				callbackOrder.push('dimensions');
				dimensions(source, output);
			},
			'conventional',
			undefined,
			(completed, total) => {
				callbackOrder.push('tile-progress');
				tileProgress(completed, total);
			}
		);
		const worker = FakeWorker.instances[0];
		expect(worker.posted).toMatchObject({
			type: 'upscale',
			file,
			expected,
			scale: 2,
			mode: 'conventional',
			model: undefined
		});
		worker.emit({ type: 'progress', stage: 'decoding' });
		worker.emit({ type: 'tile-progress', completed: 1, total: 2 });
		worker.emit({
			type: 'dimensions',
			source: { width: 40, height: 20 },
			output: { width: 80, height: 40 }
		});
		const blob = new Blob(['output'], { type: 'image/png' });
		worker.emit({ type: 'done', blob });
		expect(await job.result).toBe(blob);
		expect(progress.mock.calls.map(([stage]) => stage)).toEqual([
			'decoding',
			'inference',
			'resizing'
		]);
		expect(tileProgress).toHaveBeenCalledWith(1, 2);
		expect(dimensions).toHaveBeenCalledWith({ width: 40, height: 20 }, { width: 80, height: 40 });
		expect(callbackOrder).toEqual([
			'progress:decoding',
			'tile-progress',
			'progress:inference',
			'dimensions',
			'progress:resizing'
		]);
		expect(worker.terminated).toBe(true);
	});

	it('propagates a reported worker error and terminates', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const job = previewInWorker(new File(['image'], 'image.png'), { width: 1, height: 1 });
		const worker = FakeWorker.instances[0];
		const rejected = expect(job.result).rejects.toBe('DecodeFailed');
		worker.emit({ type: 'error', code: 'DecodeFailed' });
		await rejected;
		expect(worker.terminateCalls).toBe(1);
	});

	it('preserves learned-mode worker payloads', () => {
		vi.stubGlobal('Worker', FakeWorker);
		const file = new File(['image'], 'image.png');
		const model = new File(['model'], 'model.onnx');
		const expected = { width: 40, height: 20 };
		upscaleInWorker(
			file,
			expected,
			1,
			() => {},
			() => {},
			'onnx',
			model
		);
		expect(FakeWorker.instances[0].posted).toEqual({
			type: 'upscale',
			file,
			expected,
			scale: 1,
			mode: 'onnx',
			model
		});
	});

	it('maps a runtime worker error to WorkerFailed and preserves its diagnostic', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const job = upscaleInWorker(
			new File(['image'], 'image.png'),
			{ width: 1, height: 1 },
			2,
			() => {},
			() => {}
		);
		const worker = FakeWorker.instances[0];
		const rejected = expect(job.result).rejects.toBe('WorkerFailed');
		worker.fail('runtime failure');
		await rejected;
		expect(worker.terminateCalls).toBe(1);
		expect(error).toHaveBeenCalledWith('Upscaler processing worker failed', 'runtime failure');
	});

	it('cancels by terminating the worker and preserves a quiet cancellation code', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const job = previewInWorker(new File(['image'], 'image.png'), { width: 1, height: 1 });
		const worker = FakeWorker.instances[0];
		const rejected = expect(job.result).rejects.toBe('Cancelled');
		job.cancel();
		await rejected;
		expect(worker.terminated).toBe(true);
		expect(worker.terminateCalls).toBe(1);
		job.cancel();
		expect(worker.terminateCalls).toBe(1);
	});
});
