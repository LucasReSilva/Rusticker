import { describe, expect, it } from 'vitest';
import { mockStickers } from './test-helpers';
import { layoutPdfSheets } from './pdf-layout';
import { exportPdfSheets } from './pdf';

const makeLayout = (
	stickers: Awaited<ReturnType<typeof mockStickers>>,
	paper: 'a4' | 'letter',
	orientation: 'portrait' | 'landscape'
) =>
	layoutPdfSheets(
		stickers.map(({ id, pixels }) => ({ id, width: pixels.width, height: pixels.height })),
		{ paper, orientation, margin: 10, spacing: 5 }
	);

describe('PDF sheet export', () => {
	it.each([
		['a4', 'portrait', 595.2756, 841.8898],
		['a4', 'landscape', 841.8898, 595.2756],
		['letter', 'portrait', 612, 792],
		['letter', 'landscape', 792, 612]
	] as const)('writes exact %s %s page dimensions', async (paper, orientation, width, height) => {
		const stickers = await mockStickers(1);
		const layout = makeLayout(stickers, paper, orientation);
		const result = await exportPdfSheets(stickers, layout);
		const source = await result.blob.text();
		expect(result.blob.type).toBe('application/pdf');
		expect(source).toContain(`/MediaBox [0 0 ${width} ${height}]`);
		expect(source).toContain('/SMask');
		expect(source).toContain('/ColorSpace /DeviceGray');
		expect(result.fileName).toBe('rusticker-sticker-sheets.pdf');
	});

	it('adds pages when the layout requires pagination', async () => {
		const stickers = await mockStickers(27);
		const layout = makeLayout(stickers, 'letter', 'landscape');
		const result = await exportPdfSheets(stickers, layout);
		expect(result.pageCount).toBe(layout.pages.length);
		expect(await result.blob.text()).toContain(`/Count ${layout.pages.length}`);
	});

	it('stores source alpha values in the PDF soft mask', async () => {
		const stickers = await mockStickers(1);
		stickers[0].pixels.data.set([20, 40, 60, 0, 80, 100, 120, 127, 140, 160, 180, 255]);
		const result = await exportPdfSheets(stickers, makeLayout(stickers, 'a4', 'portrait'));
		const bytes = new Uint8Array(await result.blob.arrayBuffer());
		let source = '';
		for (let start = 0; start < bytes.length; start += 4096) {
			source += String.fromCharCode(...bytes.subarray(start, Math.min(start + 4096, bytes.length)));
		}
		const maskPosition = source.indexOf('/ColorSpace /DeviceGray');
		const objectStart = source.lastIndexOf(' obj\n<<', maskPosition);
		const streamStart = source.indexOf('stream\n', maskPosition) + 'stream\n'.length;
		const dictionary = source.slice(objectStart, streamStart);
		const length = Number(dictionary.match(/\/Length (\d+)/)?.[1]);
		const compressed = bytes.slice(streamStart, streamStart + length);
		const decompressed = await new Response(
			new Blob([compressed.buffer as ArrayBuffer])
				.stream()
				.pipeThrough(new DecompressionStream('deflate'))
		).arrayBuffer();
		const alpha = new Uint8Array(decompressed);
		expect([...alpha.slice(0, 3)]).toEqual([0, 127, 255]);
	});
});
