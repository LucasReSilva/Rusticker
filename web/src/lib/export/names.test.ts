import { afterEach, expect, it } from 'vitest';
import { getLocale, setLocale } from '$lib/paraglide/runtime';
import { packFileName, stickerWebpName, stickerPngName, TRAY_ICON_NAME } from './names';

const original = getLocale();
afterEach(() => setLocale(original, { reload: false }));
it('uses the same locale-neutral names in every locale', () => {
	for (const locale of ['pt-BR', 'en', 'es'] as const) {
		setLocale(locale, { reload: false });
		expect([
			packFileName(1),
			stickerWebpName(1),
			stickerWebpName(30),
			stickerPngName(7),
			TRAY_ICON_NAME
		]).toEqual([
			'rusticker-pack-1.zip',
			'sticker_01.webp',
			'sticker_30.webp',
			'png/sticker_07.png',
			'tray_icon.png'
		]);
	}
});
