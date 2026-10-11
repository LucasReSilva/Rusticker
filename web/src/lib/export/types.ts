import type { Sticker } from '$lib/detection/types';

export interface Encoder {
	webp(pixels: ImageData, quality: number): Promise<Blob>;
	png(pixels: ImageData): Promise<Blob>;
	trayIcon(pixels: ImageData): Promise<Blob>;
}

export interface EncodedSticker {
	blob: Blob;
	quality: number;
	bytes: number;
	overLimit: boolean;
}

export type StickerSizeInfo =
	| { status: 'pending' }
	| { status: 'ready'; bytes: number; overLimit: boolean }
	| { status: 'error' };

export interface StickerSizes {
	sync(stickers: Sticker[]): void;
	get(id: string): StickerSizeInfo;
	encoded(sticker: Sticker): Promise<EncodedSticker>;
}

export type Pack = Sticker[];
export interface PackArchive {
	fileName: string;
	blob: Blob;
	stickerCount: number;
}
export type ExportErrorCode = 'TooFewStickers' | 'WebpUnsupported' | 'EncodeFailed';
export class ExportError extends Error {
	constructor(
		readonly code: ExportErrorCode,
		options?: { cause?: unknown }
	) {
		super(code, options);
		this.name = 'ExportError';
	}
}
export interface ExportProgress {
	done: number;
	total: number;
}
export interface ExportResult {
	archives: PackArchive[];
	stickerCount: number;
	packCount: number;
	overBudgetCount: number;
}
