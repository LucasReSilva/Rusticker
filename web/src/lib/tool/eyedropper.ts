import type { Rgb } from '$lib/detection/types';

export interface Point {
	x: number;
	y: number;
}
interface Size {
	width: number;
	height: number;
}

export function moveCrosshair(position: Point, key: string, shift: boolean, size: Size): Point {
	const step = Math.max(1, Math.round(Math.min(size.width, size.height) / 100)) * (shift ? 10 : 1);
	const dx = key === 'ArrowRight' ? step : key === 'ArrowLeft' ? -step : 0;
	const dy = key === 'ArrowDown' ? step : key === 'ArrowUp' ? -step : 0;
	return {
		x: Math.max(0, Math.min(size.width - 1, position.x + dx)),
		y: Math.max(0, Math.min(size.height - 1, position.y + dy))
	};
}

/** Average a clipped neighborhood in original image pixels. */
export function sampleColor(image: ImageData, x: number, y: number, radius = 1): Rgb {
	x = Math.max(0, Math.min(image.width - 1, Math.round(x)));
	y = Math.max(0, Math.min(image.height - 1, Math.round(y)));
	let r = 0,
		g = 0,
		b = 0,
		count = 0;
	for (let row = Math.max(0, y - radius); row <= Math.min(image.height - 1, y + radius); row++) {
		for (
			let column = Math.max(0, x - radius);
			column <= Math.min(image.width - 1, x + radius);
			column++
		) {
			const offset = (row * image.width + column) * 4;
			r += image.data[offset];
			g += image.data[offset + 1];
			b += image.data[offset + 2];
			count++;
		}
	}
	return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

export function toHex(color: Rgb): string {
	return (
		'#' +
		[color.r, color.g, color.b]
			.map((channel) => channel.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()
	);
}
