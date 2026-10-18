import type { Sticker } from '$lib/detection/types';
import type { ExportResult } from './types';
import { captureExportInput, matchesExportInput, type ExportInput } from './input';

export interface ExportSession {
	get(stickers: Sticker[], trayIconId: string | null): ExportResult | undefined;
	set(stickers: Sticker[], trayIconId: string | null, result: ExportResult): void;
	clear(): void;
}

/** Ready archives belong to the editor session, independent of a localized view. */
export function createExportSession(): ExportSession {
	let saved: ExportInput | undefined;
	let result: ExportResult | undefined;
	return {
		get(stickers, trayIconId) {
			if (!saved || !matchesExportInput(saved, stickers, trayIconId)) {
				saved = undefined;
				result = undefined;
			}
			return result;
		},
		set(stickers, trayIconId, value) {
			saved = captureExportInput(stickers, trayIconId);
			result = value;
		},
		clear() {
			saved = undefined;
			result = undefined;
		}
	};
}
