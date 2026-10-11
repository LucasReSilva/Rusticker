import { createMockDetector } from '$lib/detection/mock';
import type { Encoder } from './types';

export async function mockStickers(count = 6) {
	return createMockDetector({ count }).detect(
		{ data: new Uint8ClampedArray(400), width: 10, height: 10 },
		{ background: { r: 0, g: 255, b: 0 }, tolerance: 50 }
	);
}

export function fakeEncoder(size: (quality: number) => number = () => 42): Encoder {
	return {
		webp: async (_, quality) => new Blob([new Uint8Array(size(quality))], { type: 'image/webp' }),
		png: async (pixels) => new Blob([pixels.data.slice(0, 16)], { type: 'image/png' }),
		trayIcon: async (pixels) =>
			new Blob([pixels.data.slice(512 * 256 * 4, 512 * 256 * 4 + 16)], { type: 'image/png' })
	};
}

export function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
