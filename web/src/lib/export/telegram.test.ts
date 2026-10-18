import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { mockStickers } from './test-helpers';
import { exportTelegramStickers, TelegramExportError, telegramStickerFileName } from './telegram';

it('uses locale-neutral, zero-padded Telegram filenames', () => {
	expect(telegramStickerFileName(1, 'png')).toBe('telegram_sticker_01.png');
	expect(telegramStickerFileName(100, 'webp')).toBe('telegram_sticker_100.webp');
});

it.each(['png', 'webp'] as const)('creates an ordered static %s file archive', async (format) => {
	const stickers = await mockStickers(3);
	const png = vi.fn(async () => new Blob(['transparent-png'], { type: 'image/png' }));
	const webp = vi.fn(async () => new Blob(['transparent-webp'], { type: 'image/webp' }));
	const progress = vi.fn();
	const result = await exportTelegramStickers(stickers, format, { png, webp }, progress);
	const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());

	expect(result.fileName).toBe('rusticker-telegram-stickers.zip');
	expect(result.stickerCount).toBe(3);
	expect(result.format).toBe(format);
	expect(Object.keys(zip.files)).toEqual([
		`telegram_sticker_01.${format}`,
		`telegram_sticker_02.${format}`,
		`telegram_sticker_03.${format}`
	]);
	expect(format === 'png' ? png : webp).toHaveBeenCalledTimes(3);
	for (const [index, sticker] of stickers.entries()) {
		if (format === 'png') expect(png).toHaveBeenNthCalledWith(index + 1, sticker.pixels);
		else expect(webp).toHaveBeenNthCalledWith(index + 1, sticker.pixels, 0.9);
	}
	expect(progress.mock.calls.map(([value]) => value)).toEqual(
		[0, 1, 2, 3, 4].map((done) => ({ done, total: 4 }))
	);
	expect(progress).toHaveBeenLastCalledWith({ done: 4, total: 4 });
});

it('retains the PNG failure code and cause without reporting completed encoding', async () => {
	const stickers = await mockStickers(1);
	const progress = vi.fn();
	const encoder = {
		png: vi.fn(async () => new Blob(['fallback'], { type: 'image/jpeg' })),
		webp: vi.fn()
	};
	await expect(exportTelegramStickers(stickers, 'png', encoder, progress)).rejects.toMatchObject({
		code: 'EncodeFailed',
		cause: { message: 'PngEncodingUnavailable' }
	});
	expect(progress.mock.calls).toEqual([[{ done: 0, total: 2 }]]);
	const cause = new Error('EncoderUnavailable');
	encoder.png.mockRejectedValue(cause);
	await expect(exportTelegramStickers(stickers, 'png', encoder)).rejects.toMatchObject({
		code: 'EncodeFailed',
		cause
	});
});

it('rejects an empty selection', async () => {
	await expect(
		exportTelegramStickers([], 'png', { png: vi.fn(), webp: vi.fn() })
	).rejects.toMatchObject({ code: 'EmptySelection' });
});

it('reports unsupported WEBP encoding and allows the caller to retry with PNG', async () => {
	const stickers = await mockStickers(1);
	const encoder = {
		png: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
		webp: vi.fn(async () => new Blob(['fallback'], { type: 'image/png' }))
	};
	await expect(exportTelegramStickers(stickers, 'webp', encoder)).rejects.toBeInstanceOf(
		TelegramExportError
	);
	await expect(exportTelegramStickers(stickers, 'png', encoder)).resolves.toMatchObject({
		format: 'png',
		stickerCount: 1
	});
});
