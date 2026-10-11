import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { exportPacks } from './export';
import { createStickerSizes } from './sizes.svelte';
import { fakeEncoder, mockStickers } from './test-helpers';

it.each([17, 31])(
	'exports %i stickers with exact entries, order, common chosen tray and completed progress',
	async (count) => {
		const stickers = await mockStickers(count);
		const encoder = fakeEncoder();
		encoder.webp = async (pixels) =>
			new Blob([String(stickers.findIndex((sticker) => sticker.pixels === pixels))], {
				type: 'image/webp'
			});
		const sizes = createStickerSizes(encoder);
		sizes.sync(stickers);
		const onProgress = vi.fn();
		const result = await exportPacks(stickers, stickers[2].id, { sizes, encoder, onProgress });
		expect(result.archives.map((archive) => [archive.fileName, archive.stickerCount])).toEqual(
			count === 17
				? [['rusticker-pack-1.zip', 17]]
				: [
						['rusticker-pack-1.zip', 16],
						['rusticker-pack-2.zip', 15]
					]
		);
		let offset = 0;
		const tray = await encoder.trayIcon(stickers[2].pixels);
		for (const archive of result.archives) {
			const zip = await JSZip.loadAsync(await archive.blob.arrayBuffer());
			const names = ['tray_icon.png'];
			for (let i = 1; i <= archive.stickerCount; i++) {
				const number = String(i).padStart(2, '0');
				names.push(`sticker_${number}.webp`, `png/sticker_${number}.png`);
			}
			expect(Object.keys(zip.files).sort()).toEqual(names.sort());
			expect(await zip.file('sticker_01.webp')!.async('string')).toBe(String(offset));
			expect(await zip.file('tray_icon.png')!.async('uint8array')).toEqual(
				new Uint8Array(await tray.arrayBuffer())
			);
			offset += archive.stickerCount;
		}
		expect(onProgress).toHaveBeenLastCalledWith({
			done: count + result.packCount,
			total: count + result.packCount
		});
		expect(result.overBudgetCount).toBe(0);
	}
);
it('rejects fewer than three stickers', async () => {
	const encoder = fakeEncoder();
	await expect(
		exportPacks(await mockStickers(2), null, { sizes: createStickerSizes(encoder), encoder })
	).rejects.toMatchObject({ code: 'TooFewStickers' });
});
it('counts over-budget encodings without dropping stickers', async () => {
	const encoder = fakeEncoder(() => 100_001);
	const result = await exportPacks(await mockStickers(3), null, {
		sizes: createStickerSizes(encoder),
		encoder
	});
	expect(result.overBudgetCount).toBe(3);
	expect(result.stickerCount).toBe(3);
});
