export const MAX_IMAGE_SIDE = 8192;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const SCALE_STEP = 0.5;
const MAX_HEADER_BYTES = 1024 * 1024;

export type ImageDimensions = { width: number; height: number };
export type ImageInspectionError =
	'UnsupportedFormat' | 'MalformedImage' | 'AnimatedImage' | 'ImageTooLarge';

export class ImageInspectionFailure extends Error {
	constructor(readonly code: ImageInspectionError) {
		super(code);
	}
}

function fail(code: ImageInspectionError): never {
	throw new ImageInspectionFailure(code);
}

function dimensions(width: number, height: number): ImageDimensions {
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
		fail('MalformedImage');
	if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE || width * height > MAX_IMAGE_PIXELS)
		fail('ImageTooLarge');
	return { width, height };
}

function readU24(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function pngDimensions(bytes: Uint8Array): ImageDimensions {
	const signature = [137, 80, 78, 71, 13, 10, 26, 10];
	if (!signature.every((value, index) => bytes[index] === value)) fail('UnsupportedFormat');
	if (bytes.length < 33 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR')
		fail('MalformedImage');
	let offset = 8;
	while (offset + 12 <= bytes.length) {
		const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
		const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
		if (type === 'acTL') fail('AnimatedImage');
		if (type === 'IDAT') break;
		if (length > bytes.length - offset - 12) fail('MalformedImage');
		offset += length + 12;
	}
	return dimensions(
		new DataView(bytes.buffer, bytes.byteOffset + 16, 8).getUint32(0),
		new DataView(bytes.buffer, bytes.byteOffset + 20, 8).getUint32(0)
	);
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions {
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) fail('UnsupportedFormat');
	const sof = new Set([
		0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
	]);
	let orientation = 1;
	let offset = 2;
	while (offset + 4 <= bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset++;
			continue;
		}
		while (bytes[offset] === 0xff) offset++;
		const marker = bytes[offset++];
		if (marker === 0xd9 || marker === 0xda) break;
		if (marker >= 0xd0 && marker <= 0xd7) continue;
		if (offset + 2 > bytes.length) break;
		const length = (bytes[offset] << 8) | bytes[offset + 1];
		if (length < 2) fail('MalformedImage');
		if (marker === 0xe1 && offset + length <= bytes.length) {
			const start = offset + 2;
			if (
				bytes[start] === 0x45 &&
				bytes[start + 1] === 0x78 &&
				bytes[start + 2] === 0x69 &&
				bytes[start + 3] === 0x66 &&
				bytes[start + 4] === 0 &&
				bytes[start + 5] === 0
			) {
				const tiff = start + 6;
				const little = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
				const big = bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d;
				if ((little || big) && tiff + 8 <= offset + length) {
					const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
					const u16 = (at: number) => view.getUint16(at, little);
					const ifd = tiff + view.getUint32(tiff + 4, little);
					if (u16(tiff + 2) === 42 && ifd + 2 <= offset + length) {
						const entries = u16(ifd);
						for (
							let index = 0, entry = ifd + 2;
							index < entries && entry + 12 <= offset + length;
							index++, entry += 12
						) {
							if (
								u16(entry) === 0x0112 &&
								u16(entry + 2) === 3 &&
								view.getUint32(entry + 4, little) === 1
							) {
								const value = u16(entry + 8);
								if (value >= 1 && value <= 8) orientation = value;
								break;
							}
						}
					}
				}
			}
		}
		if (sof.has(marker)) {
			if (offset + 7 > bytes.length) fail('MalformedImage');
			const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
			const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
			return dimensions(orientation >= 5 ? height : width, orientation >= 5 ? width : height);
		}
		offset += length;
	}
	fail('MalformedImage');
}

function webpDimensions(bytes: Uint8Array): ImageDimensions {
	if (
		String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' ||
		String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP'
	)
		fail('UnsupportedFormat');
	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const type = String.fromCharCode(...bytes.slice(offset, offset + 4));
		const size = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
		const data = offset + 8;
		if (type === 'ANIM' || type === 'ANMF') fail('AnimatedImage');
		if (type === 'VP8X') {
			if (size < 10 || data + 10 > bytes.length) fail('MalformedImage');
			if (bytes[data] & 0x02) fail('AnimatedImage');
			return dimensions(readU24(bytes, data + 4) + 1, readU24(bytes, data + 7) + 1);
		}
		if (type === 'VP8 ' && size >= 10 && data + 10 <= bytes.length) {
			if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a)
				fail('MalformedImage');
			return dimensions(
				((bytes[data + 7] << 8) | bytes[data + 6]) & 0x3fff,
				((bytes[data + 9] << 8) | bytes[data + 8]) & 0x3fff
			);
		}
		if (type === 'VP8L' && size >= 5 && data + 5 <= bytes.length) {
			if (bytes[data] !== 0x2f) fail('MalformedImage');
			const b1 = bytes[data + 1],
				b2 = bytes[data + 2],
				b3 = bytes[data + 3],
				b4 = bytes[data + 4];
			return dimensions(
				1 + (((b2 & 0x3f) << 8) | b1),
				1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
			);
		}
		if (size > bytes.length - data) break;
		offset = data + size + (size & 1);
	}
	fail('MalformedImage');
}

export async function inspectImageFile(file: File): Promise<ImageDimensions> {
	const bytes = new Uint8Array(await file.slice(0, MAX_HEADER_BYTES).arrayBuffer());
	if (bytes.length < 12) fail('MalformedImage');
	if (bytes[0] === 0x89) return pngDimensions(bytes);
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegDimensions(bytes);
	if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF') return webpDimensions(bytes);
	fail('UnsupportedFormat');
}

export function scaledDimensions(source: ImageDimensions, scale: number): ImageDimensions {
	if (!Number.isFinite(scale) || scale < MIN_SCALE || scale > MAX_SCALE || scale % SCALE_STEP !== 0)
		throw new RangeError('InvalidScale');
	const width = Math.round(source.width * scale);
	const height = Math.round(source.height * scale);
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height))
		throw new RangeError('InvalidDimensions');
	return dimensions(width, height);
}
