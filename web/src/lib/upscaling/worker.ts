import { scaledDimensions, type ImageDimensions } from './image';

type Request =
	| { type: 'preview'; file: File; expected: ImageDimensions }
	| { type: 'upscale'; file: File; expected: ImageDimensions; scale: number };
type Response =
	| { type: 'progress'; stage: 'decoding' | 'resizing' | 'encoding' }
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
				| 'DimensionMismatch';
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
		const { scale } = data;
		let output: ImageDimensions;
		try {
			output = scaledDimensions(source, scale);
		} catch {
			scope.postMessage({ type: 'error', code: 'ImageTooLarge' } satisfies Response);
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
