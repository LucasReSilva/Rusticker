import { describe, expect, it } from 'vitest';
import {
	layoutPdfSheets,
	movePdfSticker,
	pageDimensions,
	resizePdfSticker,
	type PdfStickerInput
} from './pdf-layout';

const settings = { paper: 'a4' as const, orientation: 'portrait' as const, margin: 10, spacing: 5 };

function stickers(count: number): PdfStickerInput[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `sticker-${index}`,
		width: index % 2 ? 512 : 256,
		height: index % 2 ? 256 : 512
	}));
}

describe('PDF sheet layout', () => {
	it('uses exact paper dimensions and orientation', () => {
		expect(pageDimensions(settings)).toEqual({ width: 210, height: 297 });
		expect(pageDimensions({ paper: 'letter', orientation: 'landscape' })).toEqual({
			width: 279.4,
			height: 215.9
		});
	});

	it('preserves aspect ratios, margins, order, spacing, and non-overlap across pages', () => {
		const result = layoutPdfSheets(stickers(27), settings);
		const all = result.pages.flatMap((page) => page.placements);
		expect(result.pages.length).toBeGreaterThan(1);
		expect(all.map(({ stickerId }) => stickerId)).toEqual(stickers(27).map(({ id }) => id));
		for (const placement of all) {
			expect(placement.x).toBeGreaterThanOrEqual(settings.margin);
			expect(placement.y).toBeGreaterThanOrEqual(settings.margin);
			expect(placement.x + placement.width).toBeLessThanOrEqual(200);
			expect(placement.y + placement.height).toBeLessThanOrEqual(287);
			expect(placement.width / placement.height).toBeCloseTo(
				placement.sourceWidth / placement.sourceHeight
			);
		}
		for (const page of result.pages) {
			for (let a = 0; a < page.placements.length; a++) {
				for (let b = a + 1; b < page.placements.length; b++) {
					const left = page.placements[a];
					const right = page.placements[b];
					const separated =
						left.x + left.width + settings.spacing <= right.x ||
						right.x + right.width + settings.spacing <= left.x ||
						left.y + left.height + settings.spacing <= right.y ||
						right.y + right.height + settings.spacing <= left.y;
					expect(separated).toBe(true);
				}
			}
		}
	});

	it('moves and resizes only when bounds, spacing, and aspect ratio remain valid', () => {
		const result = layoutPdfSheets(stickers(1), settings);
		const first = result.pages[0].placements[0];
		const moved = movePdfSticker(result, first.stickerId, 10, 10);
		expect(moved.pages[0].placements[0].x).toBe(first.x + 10);
		expect(movePdfSticker(moved, first.stickerId, -1000, 0).pages[0].placements[0].x).toBe(10);
		const resized = resizePdfSticker(result, first.stickerId, 1.2).pages[0].placements[0];
		expect(resized.width / resized.height).toBeCloseTo(first.width / first.height);
		expect(resizePdfSticker(result, first.stickerId, -1)).toBe(result);
	});

	it('rejects invalid dimensions and margins', () => {
		expect(() => layoutPdfSheets(stickers(1), { ...settings, margin: 110 })).toThrow(RangeError);
		expect(() => layoutPdfSheets([{ id: 'bad', width: 0, height: 1 }], settings)).toThrow(
			RangeError
		);
	});
});
