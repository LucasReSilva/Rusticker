import { afterEach, expect, it, vi } from 'vitest';
import { decodeImage } from './decode';

afterEach(() => vi.unstubAllGlobals());
it('applies image orientation and closes the bitmap after reading pixels', async () => {
	const bitmap = { width: 3, height: 2, close: vi.fn() };
	const pixels = { width: 3, height: 2, data: new Uint8ClampedArray(24) };
	const context = { drawImage: vi.fn(), getImageData: vi.fn(() => pixels) };
	const create = vi.fn(async () => bitmap);
	vi.stubGlobal('createImageBitmap', create);
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			getContext() {
				return context;
			}
		}
	);
	const blob = new Blob([], { type: 'image/png' });
	expect(await decodeImage(blob)).toEqual({ width: 3, height: 2, imageData: pixels });
	expect(create).toHaveBeenCalledWith(blob, { imageOrientation: 'from-image' });
	expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
	expect(bitmap.close).toHaveBeenCalledOnce();
});
it('maps failure to DecodeFailed and closes a decoded bitmap on canvas failure', async () => {
	const close = vi.fn();
	vi.stubGlobal(
		'createImageBitmap',
		vi.fn(async () => ({ width: 1, height: 1, close }))
	);
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			getContext() {
				return null;
			}
		}
	);
	await expect(decodeImage(new Blob())).rejects.toThrow('DecodeFailed');
	expect(close).toHaveBeenCalledOnce();
});
