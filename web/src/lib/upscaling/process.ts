import type { ImageDimensions } from './image';

export type UpscaleStage = 'decoding' | 'loading-model' | 'inference' | 'resizing' | 'encoding';
export type UpscaleMode = 'conventional' | 'onnx';
export type UpscaleError =
	| 'UnsupportedEnvironment'
	| 'DecodeFailed'
	| 'EncodeFailed'
	| 'ImageTooLarge'
	| 'DimensionMismatch'
	| 'WorkerFailed'
	| 'Cancelled'
	| 'ModelInvalid'
	| 'InferenceFailed'
	| 'MemoryLimit';
// Model errors remain code-only and are translated by the web layer.
export type UpscaleModelError = 'ModelInvalid' | 'InferenceFailed' | 'MemoryLimit';

type PreviewResponse =
	{ type: 'preview'; blob: Blob; source: ImageDimensions } | { type: 'error'; code: UpscaleError };
type UpscaleResponse =
	| { type: 'progress'; stage: UpscaleStage }
	| { type: 'tile-progress'; completed: number; total: number }
	| { type: 'dimensions'; source: ImageDimensions; output: ImageDimensions }
	| { type: 'done'; blob: Blob }
	| { type: 'error'; code: UpscaleError };

function runWorker<T>(
	message: unknown,
	onMessage: (
		data: unknown,
		resolve: (value: T) => void,
		reject: (error: UpscaleError) => void
	) => void,
	diagnostic: string
): { result: Promise<T>; cancel: () => void } {
	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	let settled = false;
	let rejectResult!: (error: UpscaleError) => void;
	const result = new Promise<T>((resolve, reject) => {
		rejectResult = reject;
		worker.onmessage = ({ data }) =>
			onMessage(
				data,
				(value) => {
					settled = true;
					worker.terminate();
					resolve(value);
				},
				(error) => {
					settled = true;
					worker.terminate();
					reject(error);
				}
			);
		worker.onerror = (event) => {
			settled = true;
			worker.terminate();
			console.error(diagnostic, event.message);
			reject('WorkerFailed' satisfies UpscaleError);
		};
		worker.postMessage(message);
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

export function previewInWorker(
	file: File,
	expected: ImageDimensions
): {
	result: Promise<{ blob: Blob; source: ImageDimensions }>;
	cancel: () => void;
} {
	return runWorker(
		{ type: 'preview', file, expected },
		(raw, resolve, reject) => {
			const data = raw as PreviewResponse;
			if (data.type === 'preview') resolve({ blob: data.blob, source: data.source });
			else if (data.type === 'error') reject(data.code);
		},
		'Upscaler preview worker failed'
	);
}

export function upscaleInWorker(
	file: File,
	expected: ImageDimensions,
	scale: number,
	onProgress: (stage: UpscaleStage) => void,
	onDimensions: (source: ImageDimensions, output: ImageDimensions) => void,
	mode: UpscaleMode = 'conventional',
	model?: File,
	onTileProgress: (completed: number, total: number) => void = () => {}
): { result: Promise<Blob>; cancel: () => void } {
	return runWorker<Blob>(
		{ type: 'upscale', file, expected, scale, mode, model },
		(raw, resolve, reject) => {
			const data = raw as UpscaleResponse;
			if (data.type === 'progress') onProgress(data.stage);
			else if (data.type === 'tile-progress') {
				onTileProgress(data.completed, data.total);
				onProgress('inference');
			} else if (data.type === 'dimensions') {
				onDimensions(data.source, data.output);
				onProgress('resizing');
			} else if (data.type === 'done') {
				resolve(data.blob);
			} else if (data.type === 'error') {
				reject(data.code);
			}
		},
		'Upscaler processing worker failed'
	);
}
