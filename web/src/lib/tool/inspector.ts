import type { BBox } from '$lib/detection';

export const ZOOM_LEVELS = [1, 2, 4, 8] as const;

export type CropHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function nextZoom(current: number, direction: -1 | 1): number {
	const index = Math.max(
		0,
		ZOOM_LEVELS.findIndex((level) => level === current)
	);
	return ZOOM_LEVELS[clamp(index + direction, 0, ZOOM_LEVELS.length - 1)];
}

export function sourceDelta(
	clientDelta: number,
	displayedSize: number,
	sourceSize: number
): number {
	if (!Number.isFinite(clientDelta) || displayedSize <= 0 || sourceSize <= 0) return 0;
	return Math.round((clientDelta * sourceSize) / displayedSize);
}

export function editCropBounds(
	bounds: BBox,
	handle: CropHandle,
	dx: number,
	dy: number,
	imageWidth: number,
	imageHeight: number
): BBox {
	if (handle === 'move') {
		return {
			...bounds,
			x: clamp(bounds.x + dx, 0, imageWidth - bounds.width),
			y: clamp(bounds.y + dy, 0, imageHeight - bounds.height)
		};
	}
	let left = bounds.x;
	let top = bounds.y;
	let right = bounds.x + bounds.width;
	let bottom = bounds.y + bounds.height;
	if (handle.includes('w')) left = clamp(left + dx, 0, right - 1);
	if (handle.includes('e')) right = clamp(right + dx, left + 1, imageWidth);
	if (handle.includes('n')) top = clamp(top + dy, 0, bottom - 1);
	if (handle.includes('s')) bottom = clamp(bottom + dy, top + 1, imageHeight);
	return { x: left, y: top, width: right - left, height: bottom - top };
}
