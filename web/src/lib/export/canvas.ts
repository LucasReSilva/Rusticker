import { STICKER_SIZE, TRAY_ICON_SIZE } from './constants';
import type { Encoder } from './types';

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
	return {
		webp: (pixels, quality) =>
			run(() => source(pixels).convertToBlob({ type: 'image/webp', quality })),
		png: (pixels) => run(() => source(pixels).convertToBlob({ type: 'image/png' })),
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
