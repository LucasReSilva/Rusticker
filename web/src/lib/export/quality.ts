import { MAX_STICKER_BYTES, QUALITY_FLOOR, QUALITY_SEARCH_STEPS, QUALITY_START } from './constants';
import { ExportError, type EncodedSticker, type Encoder } from './types';

export async function encodeWithinBudget(
	pixels: ImageData,
	encoder: Encoder
): Promise<EncodedSticker> {
	const encode = async (quality: number): Promise<EncodedSticker> => {
		let blob: Blob;
		try {
			blob = await encoder.webp(pixels, quality);
		} catch (cause) {
			throw new ExportError('EncodeFailed', { cause });
		}
		if (blob.type !== 'image/webp') throw new ExportError('WebpUnsupported');
		return { blob, quality, bytes: blob.size, overLimit: blob.size > MAX_STICKER_BYTES };
	};
	const start = await encode(QUALITY_START);
	if (!start.overLimit) return start;
	let best = await encode(QUALITY_FLOOR);
	if (best.overLimit) return best;
	let low = QUALITY_FLOOR;
	let high = QUALITY_START;
	for (let step = 0; step < QUALITY_SEARCH_STEPS; step++) {
		const quality = (low + high) / 2;
		const candidate = await encode(quality);
		if (candidate.overLimit) high = quality;
		else {
			best = candidate;
			low = quality;
		}
	}
	return best;
}
