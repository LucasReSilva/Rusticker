import type { Sticker } from '$lib/detection/types';
import { ExportError } from './types';

export function pickTrayIconSticker(stickers: Sticker[], trayIconId: string | null): Sticker {
	const sticker = stickers.find((sticker) => sticker.id === trayIconId) ?? stickers[0];
	if (!sticker) throw new ExportError('TooFewStickers');
	return sticker;
}
