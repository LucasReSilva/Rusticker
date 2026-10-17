import type { BBox, DetectInput } from '$lib/detection';

/** Whether bounds cover non-empty integer pixels inside a source image. */
export function validSourceBounds(bounds: BBox, width: number, height: number): boolean {
	return (
		Number.isSafeInteger(width) &&
		Number.isSafeInteger(height) &&
		width > 0 &&
		height > 0 &&
		Number.isSafeInteger(bounds.x) &&
		Number.isSafeInteger(bounds.y) &&
		Number.isSafeInteger(bounds.width) &&
		Number.isSafeInteger(bounds.height) &&
		bounds.x >= 0 &&
		bounds.y >= 0 &&
		bounds.width > 0 &&
		bounds.height > 0 &&
		bounds.x + bounds.width <= width &&
		bounds.y + bounds.height <= height
	);
}

/** Copy a source rectangle so worker transfer never detaches the editor image. */
export function extractSourceRectangle(source: DetectInput, bounds: BBox): ImageData | null {
	if (
		!validSourceBounds(bounds, source.width, source.height) ||
		source.data.length !== source.width * source.height * 4
	) {
		return null;
	}
	const data = new Uint8ClampedArray(bounds.width * bounds.height * 4);
	for (let row = 0; row < bounds.height; row++) {
		const from = ((bounds.y + row) * source.width + bounds.x) * 4;
		const to = row * bounds.width * 4;
		data.set(source.data.subarray(from, from + bounds.width * 4), to);
	}
	if (typeof ImageData !== 'undefined') return new ImageData(data, bounds.width, bounds.height);
	return { data, width: bounds.width, height: bounds.height } as ImageData;
}

/** Translate a valid crop-local detection box into source-image coordinates. */
export function sourceBounds(local: BBox, crop: BBox, width: number, height: number): BBox | null {
	if (!validSourceBounds(local, crop.width, crop.height)) return null;
	const result = { ...local, x: local.x + crop.x, y: local.y + crop.y };
	return validSourceBounds(result, width, height) ? result : null;
}
