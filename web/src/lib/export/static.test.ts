import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { exportStaticStickers, StaticExportError, staticStickerFileName } from './static';
import { flattenRgba } from './canvas';
import { buildTarGz } from './tar';
import { fakeEncoder, mockStickers } from './test-helpers';

it('uses locale-neutral static image names and .jpg for JPEG', () => {
	expect(staticStickerFileName(1, 'jpeg')).toBe('sticker_01.jpg');
	expect(staticStickerFileName(12, 'webp')).toBe('sticker_12.webp');
});

it('flattens transparent pixels over the explicitly selected JPEG background', () => {
	const result = flattenRgba(new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 128]), '#0000ff');
	expect([...result]).toEqual([0, 0, 255, 255, 128, 0, 127, 255]);
});

it('creates a ZIP with the chosen PNG format and matching MIME type', async () => {
	const stickers = await mockStickers(2);
	const result = await exportStaticStickers(stickers, 'png', 'zip', undefined, {
		png: async () => new Blob(['png'], { type: 'image/png' }),
		webp: vi.fn(),
		jpeg: vi.fn()
	});
	const archive = await JSZip.loadAsync(await result.blob.arrayBuffer());
	expect(result).toMatchObject({ fileName: 'rusticker-static-stickers.zip', imageFormat: 'png' });
	expect(Object.keys(archive.files)).toEqual(['sticker_01.png', 'sticker_02.png']);
});

it('requires an explicit JPEG background and rejects mismatched encoder MIME', async () => {
	const stickers = await mockStickers(1);
	const encoder = {
		png: vi.fn(),
		webp: vi.fn(),
		jpeg: vi.fn(async () => new Blob(['png'], { type: 'image/png' }))
	};
	await expect(
		exportStaticStickers(stickers, 'jpeg', 'zip', undefined, encoder)
	).rejects.toMatchObject({
		code: 'JpegBackgroundRequired'
	});
	await expect(
		exportStaticStickers(stickers, 'jpeg', 'zip', '#ffffff', encoder)
	).rejects.toBeInstanceOf(StaticExportError);
});

it('creates a gzip-compressed USTAR archive with the selected images', async () => {
	const stickers = await mockStickers(1);
	const result = await exportStaticStickers(stickers, 'webp', 'tar.gz', undefined, {
		png: vi.fn(),
		webp: async () => new Blob(['webp'], { type: 'image/webp' }),
		jpeg: vi.fn()
	});
	const tar = new Uint8Array(
		await new Response(
			result.blob.stream().pipeThrough(new DecompressionStream('gzip'))
		).arrayBuffer()
	);
	expect(result.fileName).toBe('rusticker-static-stickers.tar.gz');
	expect(result.blob.type).toBe('application/gzip');
	expect(new TextDecoder().decode(tar.slice(0, 'sticker_01.webp'.length))).toBe('sticker_01.webp');
	expect(new TextDecoder().decode(tar.slice(257, 263))).toBe('ustar\0');
});

it('rejects unsafe TAR entry paths', async () => {
	await expect(
		buildTarGz([{ name: '../outside.png', blob: new Blob(['pixels']) }])
	).rejects.toThrow('InvalidTarEntryName');
});

it.each(['png', 'webp', 'jpeg'] as const)(
	'preserves encoder arguments and ordered file contents for %s',
	async (format) => {
		const stickers = await mockStickers(2);
		const encoder = fakeEncoder();
		const encode = vi.spyOn(encoder, format);
		const result = await exportStaticStickers(stickers, format, 'zip', '#123456', encoder);
		const archive = await JSZip.loadAsync(await result.blob.arrayBuffer());
		for (const [index, sticker] of stickers.entries()) {
			const args =
				format === 'png' ? [sticker.pixels] : [sticker.pixels, format === 'webp' ? 0.9 : '#123456'];
			expect(encode).toHaveBeenNthCalledWith(index + 1, ...args);
			const name = staticStickerFileName(index + 1, format);
			expect(await archive.file(name)!.async('uint8array')).toEqual(
				new Uint8Array(await (await encode.mock.results[index].value).arrayBuffer())
			);
		}
		expect(encode).toHaveBeenCalledTimes(stickers.length);
	}
);

it.each(['png', 'webp', 'jpeg'] as const)(
	'rejects a mismatched %s MIME and preserves encoder failure causes',
	async (format) => {
		const stickers = await mockStickers(1);
		const encoder = fakeEncoder();
		const encode = vi.spyOn(encoder, format).mockResolvedValue(new Blob(['fallback']));
		await expect(
			exportStaticStickers(stickers, format, 'zip', '#123456', encoder)
		).rejects.toMatchObject({ code: 'FormatUnsupported' });
		const cause = new Error('EncoderUnavailable');
		encode.mockRejectedValue(cause);
		await expect(
			exportStaticStickers(stickers, format, 'zip', '#123456', encoder)
		).rejects.toMatchObject({ code: 'EncodeFailed', cause });
	}
);
