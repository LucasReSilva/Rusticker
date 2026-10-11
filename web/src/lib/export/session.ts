import type { Sticker } from '$lib/detection/types';
import type { ExportResult } from './types';

export interface ExportSession {
	get(stickers: Sticker[], trayIconId: string | null): ExportResult | undefined;
	set(stickers: Sticker[], trayIconId: string | null, result: ExportResult): void;
	clear(): void;
}

/** Ready archives belong to the editor session, independent of a localized view. */
export function createExportSession(): ExportSession {
	let saved: { id: string; pixels: ImageData }[] = [];
	let tray: string | null = null;
	let result: ExportResult | undefined;
	return {
		get(stickers, trayIconId) {
			if (
				trayIconId !== tray ||
				stickers.length !== saved.length ||
				stickers.some(
					(sticker, i) => sticker.id !== saved[i].id || sticker.pixels !== saved[i].pixels
				)
			) {
				saved = [];
				result = undefined;
			}
			return result;
		},
		set(stickers, trayIconId, value) {
			saved = stickers.map(({ id, pixels }) => ({ id, pixels }));
			tray = trayIconId;
			result = value;
		},
		clear() {
			saved = [];
			result = undefined;
		}
	};
}
