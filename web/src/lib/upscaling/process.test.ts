import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewInWorker, upscaleInWorker } from './process';

class FakeWorker {
	static instances: FakeWorker[] = [];
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	terminated = false;
	posted: unknown;
	constructor() {
		FakeWorker.instances.push(this);
	}
	postMessage(message: unknown) {
		this.posted = message;
	}
	terminate() {
		this.terminated = true;
	}
	emit(data: unknown) {
		this.onmessage?.({ data } as MessageEvent);
	}
}

afterEach(() => {
	vi.unstubAllGlobals();
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
	});

	it('reports processing stages and terminates after returning the PNG', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const progress = vi.fn();
		const dimensions = vi.fn();
		const file = new File(['image'], 'image.png');
		const expected = { width: 40, height: 20 };
		const job = upscaleInWorker(file, expected, 2, progress, dimensions);
		const worker = FakeWorker.instances[0];
		expect(worker.posted).toMatchObject({ type: 'upscale', file, expected, scale: 2 });
		worker.emit({ type: 'progress', stage: 'decoding' });
		worker.emit({
			type: 'dimensions',
			source: { width: 40, height: 20 },
			output: { width: 80, height: 40 }
		});
		const blob = new Blob(['output'], { type: 'image/png' });
		worker.emit({ type: 'done', blob });
		expect(await job.result).toBe(blob);
		expect(progress.mock.calls.map(([stage]) => stage)).toEqual(['decoding', 'resizing']);
		expect(dimensions).toHaveBeenCalledWith({ width: 40, height: 20 }, { width: 80, height: 40 });
		expect(worker.terminated).toBe(true);
	});

	it('cancels by terminating the worker and preserves a quiet cancellation code', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const job = previewInWorker(new File(['image'], 'image.png'), { width: 1, height: 1 });
		const worker = FakeWorker.instances[0];
		const rejected = expect(job.result).rejects.toBe('Cancelled');
		job.cancel();
		await rejected;
		expect(worker.terminated).toBe(true);
	});
});
