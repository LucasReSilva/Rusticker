import type { Sticker } from '$lib/detection/types';
import type { Encoder } from './types';
import { buildPackZip, type ZipEntry } from './zip';
import { buildTarGz } from './tar';

export type StaticImageFormat = 'png' | 'webp' | 'jpeg';
export type ArchiveFormat = 'zip' | 'tar.gz';
export type StaticExportErrorCode =
	'EmptySelection' | 'JpegBackgroundRequired' | 'FormatUnsupported' | 'EncodeFailed';

export class StaticExportError extends Error {
	constructor(
		readonly code: StaticExportErrorCode,
		options?: { cause?: unknown }
	) {
		super(code, options);
		this.name = 'StaticExportError';
	}
}

export interface StaticExportResult {
	fileName: string;
	blob: Blob;
	stickerCount: number;
	imageFormat: StaticImageFormat;
	archiveFormat: ArchiveFormat;
}

const mimeTypes: Record<StaticImageFormat, string> = {
	png: 'image/png',
	webp: 'image/webp',
	jpeg: 'image/jpeg'
};

export const staticStickerFileName = (index: number, format: StaticImageFormat): string =>
	`sticker_${String(index).padStart(2, '0')}.${format === 'jpeg' ? 'jpg' : format}`;

export async function exportStaticStickers(
	stickers: readonly Sticker[],
	imageFormat: StaticImageFormat,
	archiveFormat: ArchiveFormat,
	background: string | undefined,
	encoder: Pick<Encoder, 'png' | 'webp' | 'jpeg'>
): Promise<StaticExportResult> {
	if (!stickers.length) throw new StaticExportError('EmptySelection');
	if (imageFormat === 'jpeg' && !background) throw new StaticExportError('JpegBackgroundRequired');
	try {
		const entries: ZipEntry[] = [];
		for (const [index, sticker] of stickers.entries()) {
			const blob =
				imageFormat === 'png'
					? await encoder.png(sticker.pixels)
					: imageFormat === 'webp'
						? await encoder.webp(sticker.pixels, 0.9)
						: await encoder.jpeg(sticker.pixels, background!);
			if (blob.type !== mimeTypes[imageFormat]) throw new StaticExportError('FormatUnsupported');
			entries.push({ name: staticStickerFileName(index + 1, imageFormat), blob });
		}
		const isZip = archiveFormat === 'zip';
		const blob = isZip ? await buildPackZip(entries) : await buildTarGz(entries);
		const mime = isZip ? 'application/zip' : 'application/gzip';
		if (blob.type !== mime) throw new StaticExportError('FormatUnsupported');
		return {
			fileName: `rusticker-static-stickers.${archiveFormat}`,
			blob,
			stickerCount: stickers.length,
			imageFormat,
			archiveFormat
		};
	} catch (cause) {
		if (cause instanceof StaticExportError) throw cause;
		throw new StaticExportError('EncodeFailed', { cause });
	}
}
