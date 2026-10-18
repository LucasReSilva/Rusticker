import { expect, it } from 'vitest';
import { createExportSession } from './session';
import { mockStickers } from './test-helpers';
import type { ExportResult } from './types';

const result: ExportResult = {
	archives: [],
	stickerCount: 3,
	packCount: 1,
	overBudgetCount: 0
};

it('reuses archives for equivalent records and clears them explicitly', async () => {
	const stickers = await mockStickers(3);
	const session = createExportSession();
	expect(session.get(stickers, null)).toBeUndefined();
	session.set(stickers, stickers[0].id, result);
	expect(
		session.get(
			stickers.map((sticker) => ({ ...sticker })),
			stickers[0].id
		)
	).toBe(result);
	session.clear();
	expect(session.get(stickers, stickers[0].id)).toBeUndefined();
});

it.each(['order', 'removal', 'id', 'pixels', 'tray'] as const)(
	'invalidates cached archives on %s changes and never resurrects them',
	async (change) => {
		const stickers = await mockStickers(3);
		const session = createExportSession();
		session.set(stickers, null, result);
		const changed = stickers.map((sticker) => ({ ...sticker }));
		if (change === 'order') changed.reverse();
		if (change === 'removal') changed.pop();
		if (change === 'id') changed[0].id = 'replacement';
		if (change === 'pixels') changed[0].pixels = stickers[1].pixels;
		expect(session.get(changed, change === 'tray' ? stickers[0].id : null)).toBeUndefined();
		expect(session.get(stickers, null)).toBeUndefined();
		session.set(stickers, null, result);
		expect(session.get(stickers, null)).toBe(result);
	}
);

it('captures values independently of later source record and array mutation', async () => {
	const stickers = await mockStickers(3);
	const session = createExportSession();
	session.set(stickers, null, result);
	stickers[0].pixels = stickers[1].pixels;
	expect(session.get(stickers, null)).toBeUndefined();
	session.set(stickers, null, result);
	stickers.reverse();
	expect(session.get(stickers, null)).toBeUndefined();
});
