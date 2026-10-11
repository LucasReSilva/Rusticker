// Helpers shared by the wasm-worker e2e specs. Synthetic images are painted
// in the browser, so no image file is ever needed (or committed).
import type { Page } from '@playwright/test';

export type Color = [number, number, number];

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
	color: Color;
}

export interface SyntheticImage {
	width: number;
	height: number;
	background: Color;
	rects: Rect[];
}

export type Outcome =
	{ status: 'done'; count: number } | { status: 'error' | 'cancelled'; code: string };

/** What the specs can use inside `page.evaluate`. */
export interface TestWindow {
	/** Hook exposed by the dev-only /_detection page. */
	__rusticker_detection: {
		run(
			image: ImageData,
			options?: { background: { r: number; g: number; b: number }; tolerance: number }
		): Promise<Outcome>;
	};
	/** Paints a `SyntheticImage` (installed by `installPainter`). */
	__paint(spec: SyntheticImage): ImageData;
}

/** `count` well-separated rectangles in rows of `perRow` on a green image. */
export function grid(count: number, perRow: number, width: number, height: number): SyntheticImage {
	const rows = Math.ceil(count / perRow);
	const cellWidth = Math.floor(width / perRow);
	const cellHeight = Math.floor(height / rows);
	const palette: Color[] = [
		[220, 30, 30],
		[30, 30, 220],
		[240, 220, 20],
		[250, 250, 250],
		[120, 20, 120]
	];
	const rects = Array.from({ length: count }, (_, index) => ({
		x: (index % perRow) * cellWidth + Math.floor(cellWidth / 5),
		y: Math.floor(index / perRow) * cellHeight + Math.floor(cellHeight / 5),
		width: Math.floor((cellWidth * 3) / 5),
		height: Math.floor((cellHeight * 3) / 5),
		color: palette[index % palette.length]
	}));
	return { width, height, background: [0, 255, 0], rects };
}

/** Installs `window.__paint` in every document the page loads. */
export async function installPainter(page: Page): Promise<void> {
	await page.addInitScript(() => {
		(window as unknown as TestWindow).__paint = ({ width, height, background, rects }) => {
			const data = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < data.length; i += 4) {
				data[i] = background[0];
				data[i + 1] = background[1];
				data[i + 2] = background[2];
				data[i + 3] = 255;
			}
			for (const rect of rects) {
				for (let y = rect.y; y < rect.y + rect.height; y++) {
					for (let x = rect.x; x < rect.x + rect.width; x++) {
						const offset = (y * width + x) * 4;
						data[offset] = rect.color[0];
						data[offset + 1] = rect.color[1];
						data[offset + 2] = rect.color[2];
					}
				}
			}
			return new ImageData(data, width, height);
		};
	});
}

/** Runs one detection on a synthetic image through the /_detection page. */
export function runSynthetic(page: Page, spec: SyntheticImage): Promise<Outcome> {
	return page.evaluate((spec) => {
		const w = window as unknown as TestWindow;
		return w.__rusticker_detection.run(w.__paint(spec));
	}, spec);
}
