export const packFileName = (n: number): string => `rusticker-pack-${n}.zip`;
export const stickerWebpName = (i: number): string => `sticker_${String(i).padStart(2, '0')}.webp`;
export const stickerPngName = (i: number): string =>
	`png/sticker_${String(i).padStart(2, '0')}.png`;
export const TRAY_ICON_NAME = 'tray_icon.png';
