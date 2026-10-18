import type { Encoder } from './types';

export interface ImageEncodingStrategy {
	readonly mimeType: string;
	encode(pixels: ImageData): Promise<Blob>;
}

export function createTransparentImageStrategies(
	encoder: Pick<Encoder, 'png' | 'webp'>
): Record<'png' | 'webp', ImageEncodingStrategy> {
	return {
		png: {
			mimeType: 'image/png',
			encode: (pixels) => encoder.png(pixels)
		},
		webp: {
			mimeType: 'image/webp',
			encode: (pixels) => encoder.webp(pixels, 0.9)
		}
	};
}

export function createJpegImageStrategy(
	encoder: Pick<Encoder, 'jpeg'>,
	background: string
): ImageEncodingStrategy {
	return {
		mimeType: 'image/jpeg',
		encode: (pixels) => encoder.jpeg(pixels, background)
	};
}
