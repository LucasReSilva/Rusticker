import { STICKER_SIZE, type BBox } from '$lib/detection';

const CONTENT_SIZE = 480;

export type BrushMode = 'erase' | 'restore';

export interface BrushPoint {
	x: number;
	y: number;
}

export interface BrushStroke {
	mode: BrushMode;
	/** Diameter in 512x512 sticker coordinates. */
	size: number;
	points: readonly BrushPoint[];
}

function validImage(image: ImageData): boolean {
	return (
		!!image &&
		Number.isSafeInteger(image.width) &&
		Number.isSafeInteger(image.height) &&
		image.width > 0 &&
		image.height > 0 &&
		image.data instanceof Uint8ClampedArray &&
		image.data.length === image.width * image.height * 4
	);
}

/**
 * Applies a continuous path of circular brush stamps without mutating either input.
 * Restore samples exact source RGBA at pixel centers in the same aspect-fit crop
 * frame as bounds.ts. Neither mode writes to the padded area outside that frame.
 */
export function applyBrushStroke(
	currentPixels: ImageData,
	source: ImageData,
	bounds: BBox,
	stroke: BrushStroke
): ImageData | null {
	if (
		!validImage(currentPixels) ||
		currentPixels.width !== STICKER_SIZE ||
		currentPixels.height !== STICKER_SIZE ||
		!validImage(source) ||
		!bounds ||
		![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isSafeInteger) ||
		bounds.x < 0 ||
		bounds.y < 0 ||
		bounds.width <= 0 ||
		bounds.height <= 0 ||
		bounds.x + bounds.width > source.width ||
		bounds.y + bounds.height > source.height ||
		!stroke ||
		(stroke.mode !== 'erase' && stroke.mode !== 'restore') ||
		!Number.isFinite(stroke.size) ||
		stroke.size <= 0 ||
		!Array.isArray(stroke.points) ||
		stroke.points.length === 0 ||
		!Array.from(stroke.points).every(
			(point) =>
				point &&
				Number.isFinite(point.x) &&
				Number.isFinite(point.y) &&
				Math.abs(point.x) <= Number.MAX_SAFE_INTEGER &&
				Math.abs(point.y) <= Number.MAX_SAFE_INTEGER
		)
	) {
		return null;
	}

	const width =
		bounds.width >= bounds.height
			? CONTENT_SIZE
			: Math.max(1, Math.round((bounds.width * CONTENT_SIZE) / bounds.height));
	const height =
		bounds.height >= bounds.width
			? CONTENT_SIZE
			: Math.max(1, Math.round((bounds.height * CONTENT_SIZE) / bounds.width));
	const frameX = Math.floor((STICKER_SIZE - width) / 2);
	const frameY = Math.floor((STICKER_SIZE - height) / 2);
	const data = new Uint8ClampedArray(currentPixels.data);
	const radius = stroke.size / 2;

	for (let index = 0; index < stroke.points.length; index++) {
		const start = stroke.points[Math.max(0, index - 1)];
		const end = stroke.points[index];
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const lengthSquared = dx * dx + dy * dy;
		const minX = Math.max(frameX, Math.floor(Math.min(start.x, end.x) - radius));
		const maxX = Math.min(frameX + width - 1, Math.ceil(Math.max(start.x, end.x) + radius));
		const minY = Math.max(frameY, Math.floor(Math.min(start.y, end.y) - radius));
		const maxY = Math.min(frameY + height - 1, Math.ceil(Math.max(start.y, end.y) + radius));

		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				// The nearest interpolated stamp center gives gap-free circular coverage.
				const t =
					lengthSquared === 0
						? 0
						: Math.max(
								0,
								Math.min(1, ((x + 0.5 - start.x) * dx + (y + 0.5 - start.y) * dy) / lengthSquared)
							);
				if (Math.hypot(x + 0.5 - (start.x + t * dx), y + 0.5 - (start.y + t * dy)) > radius) {
					continue;
				}

				const offset = (y * STICKER_SIZE + x) * 4;
				if (stroke.mode === 'erase') {
					data.fill(0, offset, offset + 4);
				} else {
					const sourceX = bounds.x + Math.floor(((x - frameX + 0.5) * bounds.width) / width);
					const sourceY = bounds.y + Math.floor(((y - frameY + 0.5) * bounds.height) / height);
					const sourceOffset = (sourceY * source.width + sourceX) * 4;
					data.set(source.data.subarray(sourceOffset, sourceOffset + 4), offset);
				}
			}
		}
	}

	if (typeof ImageData !== 'undefined') return new ImageData(data, STICKER_SIZE, STICKER_SIZE);
	return { data, width: STICKER_SIZE, height: STICKER_SIZE } as ImageData;
}
