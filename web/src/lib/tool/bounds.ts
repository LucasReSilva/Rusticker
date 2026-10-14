import { STICKER_SIZE, type BBox, type Sticker } from '$lib/detection';

const CONTENT_SIZE = 480;

interface FrameLayout {
	width: number;
	height: number;
	x: number;
	y: number;
}

function frameLayout(bounds: BBox): FrameLayout {
	const width =
		bounds.width >= bounds.height
			? CONTENT_SIZE
			: Math.max(1, Math.round((bounds.width * CONTENT_SIZE) / bounds.height));
	const height =
		bounds.height >= bounds.width
			? CONTENT_SIZE
			: Math.max(1, Math.round((bounds.height * CONTENT_SIZE) / bounds.width));
	return {
		width,
		height,
		x: Math.floor((STICKER_SIZE - width) / 2),
		y: Math.floor((STICKER_SIZE - height) / 2)
	};
}

function validBounds(bounds: BBox, imageWidth: number, imageHeight: number): boolean {
	return (
		Number.isSafeInteger(imageWidth) &&
		Number.isSafeInteger(imageHeight) &&
		imageWidth > 0 &&
		imageHeight > 0 &&
		Number.isSafeInteger(bounds.x) &&
		Number.isSafeInteger(bounds.y) &&
		Number.isSafeInteger(bounds.width) &&
		Number.isSafeInteger(bounds.height) &&
		bounds.x >= 0 &&
		bounds.y >= 0 &&
		bounds.width > 0 &&
		bounds.height > 0 &&
		bounds.x + bounds.width <= imageWidth &&
		bounds.y + bounds.height <= imageHeight
	);
}

function sameBounds(left: BBox, right: BBox): boolean {
	return (
		left.x === right.x &&
		left.y === right.y &&
		left.width === right.width &&
		left.height === right.height
	);
}

function imageData(data: Uint8ClampedArray<ArrayBuffer>): ImageData {
	if (typeof ImageData !== 'undefined') return new ImageData(data, STICKER_SIZE, STICKER_SIZE);
	return { data, width: STICKER_SIZE, height: STICKER_SIZE } as ImageData;
}

function samplePremultiplied(
	data: Uint8ClampedArray,
	x: number,
	y: number
): [number, number, number, number] {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const xWeight = x - x0;
	const yWeight = y - y0;
	let alpha = 0;
	let red = 0;
	let green = 0;
	let blue = 0;

	for (let row = 0; row < 2; row++) {
		const py = y0 + row;
		const wy = row === 0 ? 1 - yWeight : yWeight;
		if (py < 0 || py >= STICKER_SIZE) continue;
		for (let column = 0; column < 2; column++) {
			const px = x0 + column;
			const wx = column === 0 ? 1 - xWeight : xWeight;
			if (px < 0 || px >= STICKER_SIZE) continue;
			const weight = wx * wy;
			const offset = (py * STICKER_SIZE + px) * 4;
			const pixelAlpha = data[offset + 3];
			alpha += pixelAlpha * weight;
			red += (data[offset] * pixelAlpha * weight) / 255;
			green += (data[offset + 1] * pixelAlpha * weight) / 255;
			blue += (data[offset + 2] * pixelAlpha * weight) / 255;
		}
	}

	if (alpha <= 0) return [0, 0, 0, 0];
	return [
		Math.round((red * 255) / alpha),
		Math.round((green * 255) / alpha),
		Math.round((blue * 255) / alpha),
		Math.round(alpha)
	];
}

/**
 * Reframes an existing transparent sticker cut-out using source-image bounds.
 * Invalid, fractional, empty, or out-of-image bounds are rejected with null.
 */
export function adjustStickerBounds(
	sticker: Sticker,
	bounds: BBox,
	imageWidth: number,
	imageHeight: number
): Sticker | null {
	if (
		!validBounds(sticker.bbox, imageWidth, imageHeight) ||
		!validBounds(bounds, imageWidth, imageHeight) ||
		sticker.pixels.width !== STICKER_SIZE ||
		sticker.pixels.height !== STICKER_SIZE ||
		sticker.pixels.data.length !== STICKER_SIZE * STICKER_SIZE * 4
	) {
		return null;
	}
	if (sameBounds(sticker.bbox, bounds)) return sticker;

	const from = frameLayout(sticker.bbox);
	const to = frameLayout(bounds);
	const data = new Uint8ClampedArray(STICKER_SIZE * STICKER_SIZE * 4);
	const oldScaleX = from.width / sticker.bbox.width;
	const oldScaleY = from.height / sticker.bbox.height;

	for (let row = 0; row < to.height; row++) {
		const sourceY = bounds.y + ((row + 0.5) * bounds.height) / to.height;
		const sampleY = from.y + (sourceY - sticker.bbox.y) * oldScaleY - 0.5;
		for (let column = 0; column < to.width; column++) {
			const sourceX = bounds.x + ((column + 0.5) * bounds.width) / to.width;
			const sampleX = from.x + (sourceX - sticker.bbox.x) * oldScaleX - 0.5;
			const offset = ((to.y + row) * STICKER_SIZE + to.x + column) * 4;
			data.set(samplePremultiplied(sticker.pixels.data, sampleX, sampleY), offset);
		}
	}

	return { ...sticker, bbox: { ...bounds }, pixels: imageData(data) };
}
