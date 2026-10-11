// Turns engine output into public `Sticker` objects; shared by the real and
// the mock detector so both build results the same way.
import type { RawSticker } from './protocol';
import { STICKER_SIZE, type Sticker } from './types';

/** Detection runs delivered in this page session (for unique ids). */
let run = 0;

/**
 * `new ImageData(...)` in the browser; a structurally compatible object where
 * `ImageData` does not exist (Node unit tests).
 */
export function makeImageData(
	data: Uint8ClampedArray<ArrayBuffer>,
	width: number,
	height: number
): ImageData {
	if (typeof ImageData !== 'undefined') return new ImageData(data, width, height);
	return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

/** Builds the stickers of one delivered result; ids are `d<run>-s<index>`. */
export function toStickers(raw: readonly RawSticker[]): Sticker[] {
	run += 1;
	return raw.map(({ bbox: [x, y, width, height], rgba }, index) => ({
		id: `d${run}-s${index}`,
		index,
		bbox: { x, y, width, height },
		pixels: makeImageData(new Uint8ClampedArray(rgba), STICKER_SIZE, STICKER_SIZE)
	}));
}
