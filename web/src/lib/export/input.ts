import type { Sticker } from '$lib/detection/types';

export interface ExportInput {
	readonly stickers: Sticker[];
	readonly trayIconId: string | null;
}

/** Capture record values while retaining browser-local pixel references. */
export function captureExportInput(
	stickers: readonly Sticker[],
	trayIconId: string | null
): ExportInput {
	return { stickers: stickers.map((sticker) => ({ ...sticker })), trayIconId };
}

export function matchesExportInput(
	input: ExportInput,
	stickers: readonly Sticker[],
	trayIconId: string | null
): boolean {
	return (
		input.trayIconId === trayIconId &&
		input.stickers.length === stickers.length &&
		stickers.every(
			(sticker, index) =>
				sticker.id === input.stickers[index].id && sticker.pixels === input.stickers[index].pixels
		)
	);
}
