import type { Sticker } from '$lib/detection';

export interface WorkspaceSnapshot {
	detected: Sticker[];
	removedIds: string[];
	stickerOrder: string[];
	trayIconId: string | null;
	splitUndo: Array<{ original: Sticker; replacements: Sticker[]; brushResetPixels?: ImageData }>;
	brushResetPixels: Array<[string, ImageData]>;
}

export interface WorkspaceStateForSnapshot {
	detected: Sticker[];
	removedIds: Iterable<string>;
	stickerOrder: string[];
	trayIconId: string | null;
	splitUndo: WorkspaceSnapshot['splitUndo'];
	brushResetPixels: Iterable<[string, ImageData]>;
}

export const MAX_WORKSPACE_HISTORY = 20;

/** Capture collection containers while retaining the existing sticker and pixel references. */
export function createWorkspaceSnapshot(state: WorkspaceStateForSnapshot): WorkspaceSnapshot {
	return {
		detected: [...state.detected],
		removedIds: [...state.removedIds],
		stickerOrder: [...state.stickerOrder],
		trayIconId: state.trayIconId,
		splitUndo: [...state.splitUndo],
		brushResetPixels: [...state.brushResetPixels]
	};
}

/** Return a bounded history array so callers can assign it to their reactive state. */
export function appendWorkspaceSnapshot(
	history: WorkspaceSnapshot[],
	snapshot: WorkspaceSnapshot
): WorkspaceSnapshot[] {
	return [...history, snapshot].slice(-MAX_WORKSPACE_HISTORY);
}

/** Pop without mutating a caller-owned reactive array. */
export function popWorkspaceSnapshot(history: WorkspaceSnapshot[]): {
	history: WorkspaceSnapshot[];
	snapshot: WorkspaceSnapshot | undefined;
} {
	if (!history.length) return { history, snapshot: undefined };
	return { history: history.slice(0, -1), snapshot: history[history.length - 1] };
}
