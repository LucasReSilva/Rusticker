import { expect, it } from 'vitest';
import { pickTrayIconSticker } from './tray';
import { mockStickers } from './test-helpers';

it('selects the chosen sticker or falls back to the first remaining one', async () => {
	const stickers = await mockStickers();
	expect(pickTrayIconSticker(stickers, stickers[2].id)).toBe(stickers[2]);
	expect(pickTrayIconSticker(stickers, null)).toBe(stickers[0]);
	expect(pickTrayIconSticker(stickers, 'removed')).toBe(stickers[0]);
});
