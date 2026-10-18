import { describe, expect, it } from 'vitest';
import {
	appendWorkspaceSnapshot,
	createWorkspaceSnapshot,
	MAX_WORKSPACE_HISTORY,
	popWorkspaceSnapshot,
	type WorkspaceSnapshot
} from './workspace-history';

function snapshot(id: string): WorkspaceSnapshot {
	return {
		detected: [],
		removedIds: [],
		stickerOrder: [id],
		trayIconId: id,
		splitUndo: [],
		brushResetPixels: []
	};
}

describe('workspace history', () => {
	it('copies collection containers while retaining sticker and pixel references', () => {
		const sticker = { id: 'sticker' } as WorkspaceSnapshot['detected'][number];
		const pixels = {} as ImageData;
		const detected = [sticker];
		const removedIds = new Set(['removed']);
		const stickerOrder = ['sticker'];
		const splitUndo: WorkspaceSnapshot['splitUndo'] = [
			{ original: sticker, replacements: [sticker], brushResetPixels: pixels }
		];
		const brushResetPixels = new Map([['sticker', pixels]]);
		const captured = createWorkspaceSnapshot({
			detected,
			removedIds,
			stickerOrder,
			trayIconId: 'sticker',
			splitUndo,
			brushResetPixels
		});

		detected.length = 0;
		removedIds.clear();
		stickerOrder.length = 0;
		splitUndo.length = 0;
		brushResetPixels.clear();

		expect(captured.detected).toEqual([sticker]);
		expect(captured.detected[0]).toBe(sticker);
		expect(captured.removedIds).toEqual(['removed']);
		expect(captured.stickerOrder).toEqual(['sticker']);
		expect(captured.splitUndo[0].original).toBe(sticker);
		expect(captured.splitUndo[0].brushResetPixels).toBe(pixels);
		expect(captured.brushResetPixels).toEqual([['sticker', pixels]]);
	});

	it('retains only the latest twenty snapshots and pops without mutating input history', () => {
		let history: WorkspaceSnapshot[] = [];
		for (let index = 0; index < MAX_WORKSPACE_HISTORY + 3; index++) {
			history = appendWorkspaceSnapshot(history, snapshot(String(index)));
		}
		expect(history).toHaveLength(MAX_WORKSPACE_HISTORY);
		expect(history[0].trayIconId).toBe('3');

		const beforePop = history;
		const popped = popWorkspaceSnapshot(history);
		expect(popped.snapshot?.trayIconId).toBe('22');
		expect(popped.history).toHaveLength(MAX_WORKSPACE_HISTORY - 1);
		expect(history).toBe(beforePop);
		expect(history).toHaveLength(MAX_WORKSPACE_HISTORY);
		expect(popWorkspaceSnapshot([])).toEqual({ history: [], snapshot: undefined });
	});
});
