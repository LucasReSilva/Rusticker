import { STICKER_SIZE, TRAY_ICON_SIZE } from './constants';
import type { Encoder } from './types';

export function flattenRgba(
	data: Uint8ClampedArray<ArrayBuffer>,
	background: string
): Uint8ClampedArray<ArrayBuffer> {
	if (!/^#[\da-f]{6}$/i.test(background)) throw new Error('InvalidJpegBackground');
	const rgb = [1, 3, 5].map((offset) => Number.parseInt(background.slice(offset, offset + 2), 16));
	const flattened = new Uint8ClampedArray(data.length);
	for (let offset = 0; offset < flattened.length; offset += 4) {
		const alpha = data[offset + 3] / 255;
		for (let channel = 0; channel < 3; channel++)
			flattened[offset + channel] = Math.round(
				data[offset + channel] * alpha + rgb[channel] * (1 - alpha)
			);
		flattened[offset + 3] = 255;
	}
	return flattened;
}

/** Lazy canvas allocation also makes the singleton safe to import during SSR. */
export function createCanvasEncoder(): Encoder {
	let canvas: OffscreenCanvas | undefined;
	let tray: OffscreenCanvas | undefined;
	let queue: Promise<unknown> = Promise.resolve();
	function run(job: () => Promise<Blob>): Promise<Blob> {
		const result = queue.then(job);
		queue = result.catch(() => {});
		return result;
	}
	function source(pixels: ImageData): OffscreenCanvas {
		canvas ??= new OffscreenCanvas(STICKER_SIZE, STICKER_SIZE);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('CanvasContextUnavailable');
		context.putImageData(pixels, 0, 0);
		return canvas;
	}
	function flatten(pixels: ImageData, background: string): ImageData {
		return new ImageData(flattenRgba(pixels.data, background), pixels.width, pixels.height);
	}
	return {
		webp: (pixels, quality) =>
			run(() => source(pixels).convertToBlob({ type: 'image/webp', quality })),
		png: (pixels) => run(() => source(pixels).convertToBlob({ type: 'image/png' })),
		jpeg: (pixels, background) =>
			run(() =>
				source(flatten(pixels, background)).convertToBlob({ type: 'image/jpeg', quality: 0.92 })
			),
		trayIcon: (pixels) =>
			run(() => {
				const image = source(pixels);
				tray ??= new OffscreenCanvas(TRAY_ICON_SIZE, TRAY_ICON_SIZE);
				const context = tray.getContext('2d');
				if (!context) throw new Error('CanvasContextUnavailable');
				context.clearRect(0, 0, TRAY_ICON_SIZE, TRAY_ICON_SIZE);
				context.imageSmoothingEnabled = true;
				context.imageSmoothingQuality = 'high';
				context.drawImage(image, 0, 0, TRAY_ICON_SIZE, TRAY_ICON_SIZE);
				return tray.convertToBlob({ type: 'image/png' });
			})
	};
}
