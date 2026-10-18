import type { Sticker } from '$lib/detection/types';
import type { Encoder } from './types';
import { buildPackZip } from './zip';
import { createTransparentImageStrategies } from './image-strategies';

export type TelegramImageFormat = 'png' | 'webp';
export type TelegramExportErrorCode = 'EmptySelection' | 'WebpUnsupported' | 'EncodeFailed';

export class TelegramExportError extends Error {
	constructor(
		readonly code: TelegramExportErrorCode,
		options?: { cause?: unknown }
	) {
		super(code, options);
		this.name = 'TelegramExportError';
	}
}

export interface TelegramExportProgress {
	done: number;
	total: number;
}

export interface TelegramExportResult {
	fileName: 'rusticker-telegram-stickers.zip';
	blob: Blob;
	stickerCount: number;
	format: TelegramImageFormat;
}

export const telegramStickerFileName = (index: number, format: TelegramImageFormat): string =>
	`telegram_sticker_${String(index).padStart(2, '0')}.${format}`;

export async function exportTelegramStickers(
	stickers: readonly Sticker[],
	format: TelegramImageFormat,
	encoder: Pick<Encoder, 'png' | 'webp'>,
	onProgress?: (progress: TelegramExportProgress) => void
): Promise<TelegramExportResult> {
	if (stickers.length === 0) throw new TelegramExportError('EmptySelection');
	const total = stickers.length + 1;
	let done = 0;
	const report = () => onProgress?.({ done, total });
	report();

	try {
		const strategy = createTransparentImageStrategies(encoder)[format];
		const entries = [];
		for (const [index, sticker] of stickers.entries()) {
			const blob = await strategy.encode(sticker.pixels);
			if (blob.type !== strategy.mimeType) {
				if (format === 'webp') throw new TelegramExportError('WebpUnsupported');
				throw new Error('PngEncodingUnavailable');
			}
			entries.push({ name: telegramStickerFileName(index + 1, format), blob });
			done++;
			report();
		}
		const blob = await buildPackZip(entries);
		done++;
		report();
		return {
			fileName: 'rusticker-telegram-stickers.zip',
			blob,
			stickerCount: stickers.length,
			format
		};
	} catch (cause) {
		if (cause instanceof TelegramExportError) throw cause;
		throw new TelegramExportError('EncodeFailed', { cause });
	}
}
