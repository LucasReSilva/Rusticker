import type { ImageDimensions } from './image';

export type UpscaleStage = 'decoding' | 'resizing' | 'encoding';
export type UpscaleError =
	| 'UnsupportedEnvironment'
	| 'DecodeFailed'
	| 'EncodeFailed'
	| 'ImageTooLarge'
	| 'DimensionMismatch'
	| 'WorkerFailed'
	| 'Cancelled';

export function previewInWorker(
	file: File,
	expected: ImageDimensions
): {
	result: Promise<{ blob: Blob; source: ImageDimensions }>;
	cancel: () => void;
} {
	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	let settled = false;
	let rejectResult: (error: UpscaleError) => void;
	const result = new Promise<{ blob: Blob; source: ImageDimensions }>((resolve, reject) => {
		rejectResult = reject;
		worker.onmessage = ({ data }) => {
			if (data.type === 'preview') {
				settled = true;
				worker.terminate();
				resolve({ blob: data.blob as Blob, source: data.source as ImageDimensions });
			} else if (data.type === 'error') {
				settled = true;
				worker.terminate();
				reject(data.code as UpscaleError);
			}
		};
		worker.onerror = (event) => {
			settled = true;
			worker.terminate();
			console.error('Upscaler preview worker failed', event.message);
			reject('WorkerFailed' satisfies UpscaleError);
		};
		worker.postMessage({ type: 'preview', file, expected });
	});
	return {
		result,
		cancel: () => {
			if (settled) return;
			settled = true;
			worker.terminate();
			rejectResult('Cancelled');
		}
	};
}

export function upscaleInWorker(
	file: File,
	expected: ImageDimensions,
	scale: number,
	onProgress: (stage: UpscaleStage) => void,
	onDimensions: (source: ImageDimensions, output: ImageDimensions) => void
): { result: Promise<Blob>; cancel: () => void } {
	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	let settled = false;
	let rejectResult: (error: UpscaleError) => void;
	const result = new Promise<Blob>((resolve, reject) => {
		rejectResult = reject;
		worker.onmessage = ({ data }) => {
			if (data.type === 'progress') onProgress(data.stage as UpscaleStage);
			else if (data.type === 'dimensions') {
				onDimensions(data.source as ImageDimensions, data.output as ImageDimensions);
				onProgress('resizing');
			} else if (data.type === 'done') {
				settled = true;
				worker.terminate();
				resolve(data.blob as Blob);
			} else if (data.type === 'error') {
				settled = true;
				worker.terminate();
				reject(data.code as UpscaleError);
			}
		};
		worker.onerror = (event) => {
			settled = true;
			worker.terminate();
			console.error('Upscaler processing worker failed', event.message);
			reject('WorkerFailed' satisfies UpscaleError);
		};
		worker.postMessage({ type: 'upscale', file, expected, scale });
	});
	return {
		result,
		cancel: () => {
			if (settled) return;
			settled = true;
			worker.terminate();
			rejectResult('Cancelled');
		}
	};
}
