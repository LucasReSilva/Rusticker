import { scaledDimensions, type ImageDimensions } from './image';
import type { UpscaleMode } from './process';
import type { OnnxSession } from './onnx-runtime';

type Request =
	| { type: 'preview'; file: File; expected: ImageDimensions }
	| {
			type: 'upscale';
			file: File;
			expected: ImageDimensions;
			scale: number;
			mode?: UpscaleMode;
			model?: File;
	  };
type Response =
	| {
			type: 'progress';
			stage: 'decoding' | 'loading-model' | 'inference' | 'resizing' | 'encoding';
	  }
	| { type: 'tile-progress'; completed: number; total: number }
	| { type: 'dimensions'; source: ImageDimensions; output: ImageDimensions }
	| { type: 'preview'; blob: Blob; source: ImageDimensions }
	| { type: 'done'; blob: Blob }
	| {
			type: 'error';
			code:
				| 'UnsupportedEnvironment'
				| 'DecodeFailed'
				| 'EncodeFailed'
				| 'ImageTooLarge'
				| 'DimensionMismatch'
				| 'ModelInvalid'
				| 'InferenceFailed'
				| 'MemoryLimit';
	  };

const scope = self as unknown as {
	onmessage: ((event: MessageEvent<Request>) => void) | null;
	postMessage: (message: Response) => void;
};

scope.onmessage = async ({ data }: MessageEvent<Request>) => {
	let bitmap: ImageBitmap | undefined;
	try {
		const { file } = data;
		if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
			scope.postMessage({ type: 'error', code: 'UnsupportedEnvironment' } satisfies Response);
			return;
		}
		scope.postMessage({ type: 'progress', stage: 'decoding' } satisfies Response);
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const source = { width: bitmap.width, height: bitmap.height };
		const dimensionsMatch =
			(source.width === data.expected.width && source.height === data.expected.height) ||
			(source.width === data.expected.height && source.height === data.expected.width);
		if (!dimensionsMatch) {
			scope.postMessage({ type: 'error', code: 'DimensionMismatch' } satisfies Response);
			return;
		}
		try {
			scaledDimensions(source, 1);
		} catch {
			scope.postMessage({ type: 'error', code: 'ImageTooLarge' } satisfies Response);
			return;
		}
		if (data.type === 'preview') {
			const factor = Math.min(1, 512 / source.width, 512 / source.height);
			const preview = new OffscreenCanvas(
				Math.max(1, Math.round(source.width * factor)),
				Math.max(1, Math.round(source.height * factor))
			);
			const context = preview.getContext('2d', { alpha: true });
			if (!context || typeof preview.convertToBlob !== 'function') {
				scope.postMessage({ type: 'error', code: 'UnsupportedEnvironment' } satisfies Response);
				return;
			}
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = 'high';
			context.drawImage(bitmap, 0, 0, preview.width, preview.height);
			const blob = await preview.convertToBlob({ type: 'image/png' });
			if (blob.type !== 'image/png' || !blob.size) {
				scope.postMessage({ type: 'error', code: 'EncodeFailed' } satisfies Response);
				return;
			}
			scope.postMessage({ type: 'preview', blob, source } satisfies Response);
			return;
		}
		const scale = data.mode === 'onnx' ? 4 : data.scale;
		let output: ImageDimensions;
		try {
			output = scaledDimensions(source, scale);
		} catch {
			scope.postMessage({ type: 'error', code: 'ImageTooLarge' } satisfies Response);
			return;
		}
		if (data.mode === 'onnx') {
			if (!data.model) {
				scope.postMessage({ type: 'error', code: 'ModelInvalid' } satisfies Response);
				return;
			}
			let output: ImageDimensions;
			try {
				output = scaledDimensions(source, 4);
			} catch {
				scope.postMessage({ type: 'error', code: 'MemoryLimit' } satisfies Response);
				return;
			}
			const pixels = new OffscreenCanvas(source.width, source.height);
			const pixelsContext = pixels.getContext('2d', { willReadFrequently: true });
			if (!pixelsContext) {
				scope.postMessage({ type: 'error', code: 'UnsupportedEnvironment' } satisfies Response);
				return;
			}
			pixelsContext.drawImage(bitmap, 0, 0);
			const imageData = pixelsContext.getImageData(0, 0, source.width, source.height);
			const alpha = new Uint8ClampedArray(source.width * source.height);
			for (let index = 0; index < alpha.length; index++)
				alpha[index] = imageData.data[index * 4 + 3];
			bitmap.close();
			bitmap = undefined;
			scope.postMessage({ type: 'dimensions', source, output } satisfies Response);
			scope.postMessage({ type: 'progress', stage: 'loading-model' } satisfies Response);
			let session: OnnxSession | undefined;
			let releaseSession: ((active: OnnxSession) => Promise<void>) | undefined;
			try {
				const { createOnnxSession, releaseOnnxSession } = await import('./onnx-runtime');
				const { upscaleRgbWithSession } = await import('./onnx-model');
				releaseSession = releaseOnnxSession;
				session = await createOnnxSession(data.model);
				scope.postMessage({ type: 'progress', stage: 'inference' } satisfies Response);
				const rgba = await upscaleRgbWithSession(
					session,
					imageData.data,
					source,
					(completed, total) => {
						scope.postMessage({ type: 'tile-progress', completed, total } satisfies Response);
					}
				);
				const alphaCanvas = new OffscreenCanvas(source.width, source.height);
				const alphaContext = alphaCanvas.getContext('2d', { willReadFrequently: true });
				if (!alphaContext) throw new Error('UnsupportedEnvironment');
				const alphaData = alphaContext.createImageData(source.width, source.height);
				for (let index = 0; index < alpha.length; index++) {
					const offset = index * 4;
					alphaData.data[offset] = alphaData.data[offset + 1] = alphaData.data[offset + 2] = 255;
					alphaData.data[offset + 3] = alpha[index];
				}
				alphaContext.putImageData(alphaData, 0, 0);
				const resultCanvas = new OffscreenCanvas(output.width, output.height);
				const resultContext = resultCanvas.getContext('2d', { alpha: true });
				if (!resultContext || typeof resultCanvas.convertToBlob !== 'function')
					throw new Error('UnsupportedEnvironment');
				const rgbData = new ImageData(new Uint8ClampedArray(rgba), output.width, output.height);
				resultContext.putImageData(rgbData, 0, 0);
				resultContext.imageSmoothingEnabled = true;
				resultContext.imageSmoothingQuality = 'high';
				resultContext.globalCompositeOperation = 'destination-in';
				resultContext.drawImage(alphaCanvas, 0, 0, output.width, output.height);
				scope.postMessage({ type: 'progress', stage: 'encoding' } satisfies Response);
				const blob = await resultCanvas.convertToBlob({ type: 'image/png' });
				if (blob.type !== 'image/png' || !blob.size) throw new Error('EncodeFailed');
				scope.postMessage({ type: 'done', blob } satisfies Response);
			} catch (cause) {
				const message = cause instanceof Error ? cause.message : '';
				const code =
					message === 'UnsupportedEnvironment' || message === 'EncodeFailed'
						? message
						: message === 'ModelInvalid' ||
							  message === 'InferenceFailed' ||
							  message === 'MemoryLimit'
							? message
							: 'InferenceFailed';
				scope.postMessage({ type: 'error', code } satisfies Response);
			} finally {
				if (session && releaseSession) {
					try {
						await releaseSession(session);
					} catch {
						// Session teardown must not hide the processing result.
					}
				}
			}
			return;
		}
		scope.postMessage({ type: 'dimensions', source, output } satisfies Response);
		scope.postMessage({ type: 'progress', stage: 'resizing' } satisfies Response);
		const canvas = new OffscreenCanvas(output.width, output.height);
		const context = canvas.getContext('2d', { alpha: true });
		if (!context) {
			scope.postMessage({ type: 'error', code: 'UnsupportedEnvironment' } satisfies Response);
			return;
		}
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, 0, 0, output.width, output.height);
		bitmap.close();
		bitmap = undefined;
		scope.postMessage({ type: 'progress', stage: 'encoding' } satisfies Response);
		if (typeof canvas.convertToBlob !== 'function') {
			scope.postMessage({ type: 'error', code: 'UnsupportedEnvironment' } satisfies Response);
			return;
		}
		const blob = await canvas.convertToBlob({ type: 'image/png' });
		if (blob.type !== 'image/png' || blob.size === 0) {
			scope.postMessage({ type: 'error', code: 'EncodeFailed' } satisfies Response);
			return;
		}
		scope.postMessage({ type: 'done', blob } satisfies Response);
	} catch {
		scope.postMessage({ type: 'error', code: 'DecodeFailed' } satisfies Response);
	} finally {
		bitmap?.close();
	}
};
