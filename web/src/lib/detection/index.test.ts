import { afterEach, describe, expect, it, vi } from 'vitest';

describe('detection module', () => {
	it('can be imported where Worker does not exist (prerender, SSR)', async () => {
		expect(typeof (globalThis as { Worker?: unknown }).Worker).toBe('undefined');
		const detection = await import('./index');
		expect(typeof detection.createDetector).toBe('function');
		expect(typeof detection.createMockDetector).toBe('function');
		expect(typeof detection.detectionErrorMessage).toBe('function');
		expect(typeof detection.isCancelled).toBe('function');
	});
});

type Behavior =
	'crash' | 'reject' | 'no-stickers' | 'no-stickers-then-succeed' | 'succeed' | 'hang';

/**
 * A stand-in for the module worker that speaks just enough of Comlink's
 * wire protocol: it answers worker calls with an empty success, crashes
 * (fires `error`), or never answers.
 */
class FakeWorker extends EventTarget {
	static instances: FakeWorker[] = [];
	static behaviors: Behavior[] = [];
	readonly behavior: Behavior;
	terminated = false;
	readonly received: Array<{ rgba?: ArrayBuffer }> = [];

	constructor(
		readonly url: URL,
		readonly options: WorkerOptions
	) {
		super();
		this.behavior = FakeWorker.behaviors[FakeWorker.instances.length] ?? 'succeed';
		FakeWorker.instances.push(this);
	}

	postMessage(message: {
		id?: string;
		type: string;
		argumentList?: Array<{ value: { rgba?: ArrayBuffer } }>;
	}) {
		if (message.type !== 'APPLY') return;
		this.received.push(message.argumentList?.[0]?.value ?? {});
		if (this.behavior === 'reject') throw new Error('transport boom');
		setTimeout(() => {
			if (this.behavior === 'crash') {
				const event = new Event('error') as Event & { message: string };
				event.message = 'boom';
				this.dispatchEvent(event);
			} else if (
				this.behavior === 'succeed' ||
				(this.behavior === 'no-stickers-then-succeed' && this.received.length > 1)
			) {
				const reply = new Event('message') as Event & { data: unknown };
				reply.data = { id: message.id, type: 'RAW', value: { ok: true, stickers: [] } };
				this.dispatchEvent(reply);
			} else if (
				this.behavior === 'no-stickers' ||
				(this.behavior === 'no-stickers-then-succeed' && this.received.length === 1)
			) {
				const reply = new Event('message') as Event & { data: unknown };
				reply.data = { id: message.id, type: 'RAW', value: { ok: false, code: 'NoStickers' } };
				this.dispatchEvent(reply);
			}
		}, 0);
	}

	terminate() {
		this.terminated = true;
	}
}

const options = { background: { r: 0, g: 255, b: 0 }, tolerance: 50 };
const image = () => ({ data: new Uint8ClampedArray(16).fill(9), width: 2, height: 2 });

describe('createDetector', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		FakeWorker.instances = [];
		FakeWorker.behaviors = [];
	});

	it('spawns one module worker eagerly and keeps the caller image intact', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		const { createDetector } = await import('./index');
		const detector = createDetector();
		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].options).toEqual({ type: 'module' });

		const input = image();
		await expect(detector.detect(input, options)).resolves.toEqual([]);
		await expect(detector.detect(input, options)).resolves.toEqual([]);
		expect(FakeWorker.instances).toHaveLength(1);
		expect(input.data.every((value) => value === 9)).toBe(true);
		expect(FakeWorker.instances[0].received[0].rgba?.byteLength).toBe(16);
		detector.dispose();
		expect(FakeWorker.instances[0].terminated).toBe(true);
	});

	it('reports a crash as WorkerFailed and recovers on a fresh worker', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		FakeWorker.behaviors = ['crash', 'succeed'];
		const { createDetector, DetectionError } = await import('./index');
		const detector = createDetector();

		const failure = await detector.detect(image(), options).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DetectionError);
		expect((failure as InstanceType<typeof DetectionError>).code).toBe('WorkerFailed');
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await expect(detector.detect(image(), options)).resolves.toEqual([]);
		expect(FakeWorker.instances).toHaveLength(2);
	});

	it('recovers split proposals on a fresh worker after a crash', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		FakeWorker.behaviors = ['crash', 'succeed'];
		const { createDetector, DetectionError } = await import('./index');
		const detector = createDetector();
		const input = { data: new Uint8ClampedArray(512 * 512 * 4).fill(9), width: 512, height: 512 };

		const failure = await detector.proposeSplit(input).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DetectionError);
		expect((failure as InstanceType<typeof DetectionError>).code).toBe('WorkerFailed');
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await expect(detector.proposeSplit(input)).resolves.toEqual([]);
		expect(FakeWorker.instances).toHaveLength(2);
		expect(input.data.every((value) => value === 9)).toBe(true);
		expect(FakeWorker.instances[1].received[0].rgba?.byteLength).toBe(512 * 512 * 4);
		detector.dispose();
	});

	it('normalizes a rejected worker call and recovers on a fresh worker', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		FakeWorker.behaviors = ['reject', 'succeed'];
		const { createDetector, DetectionError } = await import('./index');
		const detector = createDetector();

		const failure = await detector.detect(image(), options).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DetectionError);
		expect((failure as InstanceType<typeof DetectionError>).code).toBe('WorkerFailed');
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await expect(detector.detect(image(), options)).resolves.toEqual([]);
		expect(FakeWorker.instances).toHaveLength(2);
		detector.dispose();
	});

	it('keeps the worker after a core-coded failure', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		FakeWorker.behaviors = ['no-stickers-then-succeed'];
		const { createDetector, DetectionError } = await import('./index');
		const detector = createDetector();

		const failure = await detector.detect(image(), options).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DetectionError);
		expect((failure as InstanceType<typeof DetectionError>).code).toBe('NoStickers');
		expect(FakeWorker.instances[0].terminated).toBe(false);

		await expect(detector.detect(image(), options)).resolves.toEqual([]);
		expect(FakeWorker.instances).toHaveLength(1);
		detector.dispose();
	});

	it('dispose cancels in-flight work and later calls fail with WorkerFailed', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		FakeWorker.behaviors = ['hang'];
		const { createDetector, isCancelled, DetectionError } = await import('./index');
		const detector = createDetector();
		const pending = detector.detect(image(), options);
		detector.dispose();
		await expect(pending).rejects.toSatisfy(isCancelled);
		expect(FakeWorker.instances[0].terminated).toBe(true);
		const after = await detector.detect(image(), options).catch((error: unknown) => error);
		expect(after).toBeInstanceOf(DetectionError);
		expect((after as InstanceType<typeof DetectionError>).code).toBe('WorkerFailed');
	});
});
