import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest';
import {
	createEditorState,
	getEditor,
	setEditorForTesting,
	type EditorState
} from './state.svelte';
import { createMockDetector, cancelledError, type Detector, type Sticker } from './detection';

const pixels = { width: 30, height: 30, data: new Uint8ClampedArray(30 * 30 * 4) } as ImageData;
const decoded = { imageData: pixels, width: 30, height: 30 };
const file = () => new File([], 'sheet.png', { type: 'image/png' });
let editor: EditorState;
let detector: Detector;
let decode: Mock<() => Promise<typeof decoded>>;

beforeEach(() => {
	vi.stubGlobal(
		'ImageData',
		class {
			data: Uint8ClampedArray;
			width: number;
			height: number;
			constructor(data: Uint8ClampedArray, width: number, height: number) {
				this.data = data;
				this.width = width;
				this.height = height;
			}
		}
	);
	URL.createObjectURL = vi.fn(() => 'blob:local-sheet');
	URL.revokeObjectURL = vi.fn();
	detector = createMockDetector({ count: 3 });
	vi.spyOn(detector, 'detect');
	vi.spyOn(detector, 'dispose');
	decode = vi.fn(async () => decoded);
	editor = createEditorState({ detector, decode });
});
afterEach(() => {
	editor.dispose();
	setEditorForTesting(null);
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it('loads locally, defaults the tray icon, curates and falls back when the tray is removed', async () => {
	await editor.loadFile(file());
	expect(editor.stickers).toHaveLength(3);
	expect(editor.trayIconId).toBe(editor.stickers[0].id);
	const chosen = editor.stickers[1].id;
	editor.setTrayIcon(chosen);
	expect(editor.trayIconId).toBe(chosen);
	editor.removeSticker(chosen);
	expect(editor.stickers).toHaveLength(2);
	expect(editor.trayIconId).toBe(editor.stickers[0].id);
	editor.setTrayIcon('missing');
	expect(editor.trayIconId).toBe(editor.stickers[0].id);
});
it('reorders kept stickers without changing the tray icon and removes moved IDs from the order', async () => {
	await editor.loadFile(file());
	const original = editor.stickers.map((sticker) => sticker.id);
	editor.setTrayIcon(original[1]);

	expect(editor.reorderSticker(original[2], 0)).toBe(true);
	expect(editor.stickers.map((sticker) => sticker.id)).toEqual([
		original[2],
		original[0],
		original[1]
	]);
	expect(editor.trayIconId).toBe(original[1]);
	expect(editor.reorderSticker('missing', 0)).toBe(false);
	expect(editor.reorderSticker(original[2], 4)).toBe(false);

	editor.removeSticker(original[0]);
	expect(editor.stickers.map((sticker) => sticker.id)).toEqual([original[2], original[1]]);
	expect(editor.trayIconId).toBe(original[1]);
});

it('resets custom order and removals when a new detection result replaces the set', async () => {
	vi.useFakeTimers();
	await editor.loadFile(file());
	const original = editor.stickers.map((sticker) => sticker.id);
	editor.reorderSticker(original[2], 0);
	editor.removeSticker(original[0]);
	editor.setTolerance(60);
	await vi.advanceTimersByTimeAsync(300);

	expect(editor.stickers.map((sticker) => sticker.index)).toEqual([0, 1, 2]);
	expect(editor.stickers.map((sticker) => sticker.id)).not.toEqual(original);
	expect(editor.removedIds.size).toBe(0);
});

it('keeps split candidates at the source position and restores that position on undo', async () => {
	editor.dispose();
	detector = createMockDetector({ count: 3, splitCount: 2 });
	vi.spyOn(detector, 'detect');
	vi.spyOn(detector, 'dispose');
	editor = createEditorState({ detector, decode });
	await editor.loadFile(file());
	const [first, source, last] = editor.stickers;
	expect(editor.reorderSticker(source.id, 0)).toBe(true);
	await editor.requestSplit(source.id);
	editor.acceptSplit();
	const candidates = editor.stickers.slice(0, 2);
	expect(editor.stickers.map((sticker) => sticker.id)).toEqual([
		...candidates.map((sticker) => sticker.id),
		first.id,
		last.id
	]);
	editor.undoSplit(candidates[0].id);
	expect(editor.stickers.map((sticker) => sticker.id)).toEqual([source.id, first.id, last.id]);
});

it('applies valid source bounds atomically and ignores invalid bounds', async () => {
	await editor.loadFile(file());
	const original = editor.stickers[0];
	const bounds = { ...original.bbox, x: original.bbox.x + 1, width: original.bbox.width - 1 };

	editor.updateStickerBounds(original.id, bounds);

	const updated = editor.stickers[0];
	expect(updated.bbox).toEqual(bounds);
	expect(updated.pixels).not.toBe(original.pixels);
	expect(updated.pixels.width).toBe(512);
	editor.updateStickerBounds(original.id, { ...bounds, x: 30 });
	expect(editor.stickers[0]).toBe(updated);
});

it('keeps custom order when adjusting a moved sticker', async () => {
	await editor.loadFile(file());
	const originalIds = editor.stickers.map((sticker) => sticker.id);
	const moved = editor.stickers[2];
	const bounds = { ...moved.bbox, x: moved.bbox.x + 1, width: moved.bbox.width - 1 };

	expect(editor.reorderSticker(moved.id, 0)).toBe(true);
	editor.updateStickerBounds(moved.id, bounds);

	expect(editor.stickers.map((sticker) => sticker.id)).toEqual([
		originalIds[2],
		originalIds[0],
		originalIds[1]
	]);
	expect(editor.stickers[0].bbox).toEqual(bounds);
	expect(editor.trayIconId).toBe(originalIds[0]);
});

it('keeps split proposals separate until accepted and supports undo', async () => {
	editor.dispose();
	detector = createMockDetector({ count: 1, splitCount: 2 });
	editor = createEditorState({ detector, decode });
	await editor.loadFile(file());
	const original = editor.stickers[0];
	await editor.requestSplit(original.id);
	expect(editor.stickers).toEqual([original]);
	expect(editor.splitPreview?.candidates).toHaveLength(2);
	editor.acceptSplit();
	expect(editor.stickers).toHaveLength(2);
	for (const sticker of editor.stickers) {
		expect(sticker.bbox.x).toBeGreaterThanOrEqual(original.bbox.x);
		expect(sticker.bbox.y).toBeGreaterThanOrEqual(original.bbox.y);
		expect(sticker.bbox.x + sticker.bbox.width).toBeLessThanOrEqual(
			original.bbox.x + original.bbox.width
		);
		expect(sticker.bbox.y + sticker.bbox.height).toBeLessThanOrEqual(
			original.bbox.y + original.bbox.height
		);
	}
	expect(editor.undoableStickerIds.size).toBe(2);
	editor.undoSplit(editor.stickers[0].id);
	expect(editor.stickers).toEqual([original]);
	expect(editor.undoableStickerIds.size).toBe(0);
});
it('undoes nested splits with their descendants when restoring an ancestor', async () => {
	editor.dispose();
	detector = createMockDetector({ count: 1, splitCount: 2 });
	editor = createEditorState({ detector, decode });
	await editor.loadFile(file());
	const original = editor.stickers[0];
	await editor.requestSplit(original.id);
	editor.acceptSplit();
	const [firstChild, sibling] = editor.stickers;
	await editor.requestSplit(firstChild.id);
	editor.acceptSplit();
	expect(editor.stickers).toHaveLength(3);
	expect(editor.undoableStickerIds.size).toBe(4);

	editor.undoSplit(sibling.id);

	expect(editor.stickers).toEqual([original]);
	expect(editor.undoableStickerIds.size).toBe(0);
	expect(editor.splitPreview).toBeNull();
});
it('keeps the original unchanged when no split proposal is available or discarded', async () => {
	await editor.loadFile(file());
	const original = editor.stickers[0];
	await editor.requestSplit(original.id);
	expect(editor.noSplitProposalId).toBe(original.id);
	expect(editor.stickers).toContainEqual(original);
	editor.dispose();
	detector = createMockDetector({ count: 1, splitCount: 2 });
	editor = createEditorState({ detector, decode });
	await editor.loadFile(file());
	const candidateSource = editor.stickers[0];
	await editor.requestSplit(candidateSource.id);
	editor.discardSplit();
	expect(editor.stickers).toEqual([candidateSource]);
});
it('discards a pending split proposal when its sticker bounds change', async () => {
	vi.spyOn(detector, 'proposeSplit');
	let finishProposal!: (value: Sticker[]) => void;
	vi.mocked(detector.proposeSplit).mockImplementationOnce(
		() => new Promise((resolve) => (finishProposal = resolve))
	);
	await editor.loadFile(file());
	const original = editor.stickers[0];
	const pending = editor.requestSplit(original.id);
	editor.updateStickerBounds(original.id, {
		...original.bbox,
		x: original.bbox.x + 1,
		width: original.bbox.width - 1
	});
	finishProposal([]);
	await pending;
	expect(editor.splitPreview).toBeNull();
	expect(editor.noSplitProposalId).toBeNull();
	expect(editor.splitBusyId).toBeNull();
});
it('keeps the previous source and results after an unsupported file or decode failure, including repeated errors', async () => {
	await editor.loadFile(file());
	const source = editor.source;
	const stickers = editor.stickers;
	await editor.loadFile(new Blob([], { type: 'text/plain' }));
	expect(editor.lastError).toBe('UnsupportedFile');
	expect(editor.source).toBe(source);
	expect(editor.stickers).toEqual(stickers);
	const sequence = editor.errorSequence;
	editor.rejectFile();
	expect(editor.errorSequence).toBe(sequence + 1);
	decode.mockRejectedValueOnce(new Error('bad image'));
	await editor.loadFile(file());
	expect(editor.lastError).toBe('DecodeFailed');
	expect(editor.source).toBe(source);
	expect(editor.stickers).toEqual(stickers);
	expect(editor.isProcessing).toBe(false);
});
it('coalesces tolerance changes and cancels the debounce when the background changes', async () => {
	vi.useFakeTimers();
	await editor.loadFile(file());
	editor.setTolerance(55);
	editor.setTolerance(63);
	editor.setTolerance(70.4);
	expect(editor.tolerance).toBe(70);
	expect(editor.isProcessing).toBe(true);
	expect(detector.detect).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(299);
	expect(detector.detect).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(1);
	expect(detector.detect).toHaveBeenCalledTimes(2);
	expect(detector.detect).toHaveBeenLastCalledWith(pixels, {
		background: { r: 0, g: 177, b: 64 },
		tolerance: 70
	});
	editor.removeSticker(editor.stickers[0].id);
	expect(editor.removedIds.size).toBe(1);
	editor.setTolerance(80);
	editor.setBackground({ r: 1, g: 2, b: 3 });
	await vi.advanceTimersByTimeAsync(300);
	expect(detector.detect).toHaveBeenCalledTimes(3);
	expect(editor.removedIds.size).toBe(0);
	expect(editor.isProcessing).toBe(false);
	expect(editor.stickers).toHaveLength(3);
});
it('clears results on NoStickers while keeping the source', async () => {
	editor.dispose();
	editor = createEditorState({ detector: createMockDetector({ failWith: 'NoStickers' }), decode });
	await editor.loadFile(file());
	expect(editor.lastError).toBe('NoStickers');
	expect(editor.status).toBe('error');
	expect(editor.source).not.toBeNull();
	expect(editor.stickers).toHaveLength(0);
});
it('tracks processing across asynchronous decode and detection', async () => {
	vi.useFakeTimers();
	let finishDecode!: (value: typeof decoded) => void;
	editor.dispose();
	editor = createEditorState({
		detector: createMockDetector({ delayMs: 50 }),
		decode: () => new Promise((resolve) => (finishDecode = resolve))
	});
	const loading = editor.loadFile(file());
	expect(editor.status).toBe('decoding');
	expect(editor.isProcessing).toBe(true);
	finishDecode(decoded);
	await vi.advanceTimersByTimeAsync(0);
	expect(editor.status).toBe('detecting');
	expect(editor.isProcessing).toBe(true);
	await vi.advanceTimersByTimeAsync(50);
	await loading;
	expect(editor.isProcessing).toBe(false);
});
it('ignores stale decode results after a newer file and disposes local resources', async () => {
	let finishDecode!: (value: typeof decoded) => void;
	decode.mockImplementationOnce(() => new Promise((resolve) => (finishDecode = resolve)));
	const older = editor.loadFile(file());
	await editor.loadFile(new File([], 'new.png', { type: 'image/png' }));
	finishDecode(decoded);
	await older;
	expect(editor.source?.name).toBe('new.png');
	expect(detector.detect).toHaveBeenCalledOnce();
	editor.dispose();
	expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-sheet');
	expect(detector.dispose).toHaveBeenCalled();
});
it('ignores stale detection results and cancellation when a newer setting is waiting', async () => {
	vi.useFakeTimers();
	const completions: { resolve: (value: Sticker[]) => void; reject: (error: unknown) => void }[] =
		[];
	vi.mocked(detector.detect).mockImplementation(
		() => new Promise((resolve, reject) => completions.push({ resolve, reject }))
	);
	const loading = editor.loadFile(file());
	await vi.advanceTimersByTimeAsync(0);
	editor.setTolerance(60);
	completions[0].resolve([]);
	await loading;
	expect(editor.status).toBe('detecting');
	expect(editor.isProcessing).toBe(true);
	await vi.advanceTimersByTimeAsync(300);
	editor.setBackground({ r: 0, g: 0, b: 0 });
	completions[1].reject(cancelledError());
	completions[2].resolve([]);
	await vi.advanceTimersByTimeAsync(0);
	expect(editor.lastError).toBeNull();
	expect(editor.status).toBe('ready');
	expect(editor.isProcessing).toBe(false);
});
it('retains one injected singleton and can reset it without creating a worker', () => {
	setEditorForTesting(editor);
	expect(getEditor()).toBe(editor);
	expect(getEditor()).toBe(getEditor());
	const replacement = createEditorState({ detector: createMockDetector(), decode });
	setEditorForTesting(replacement);
	expect(getEditor()).toBe(replacement);
	replacement.dispose();
	setEditorForTesting(null);
});

it('processes several files sequentially and retains their sticker results', async () => {
	editor.addBatchFiles([
		new File([], 'first.png', { type: 'image/png' }),
		new File([], 'second.png', { type: 'image/png' })
	]);
	await vi.waitFor(() =>
		expect(editor.batchEntries.every((entry) => entry.status === 'done')).toBe(true)
	);
	expect(editor.batchEntries.map((entry) => entry.file.name)).toEqual(['first.png', 'second.png']);
	expect(editor.batchStickers).toHaveLength(6);
	expect(detector.detect).toHaveBeenCalledTimes(2);
	const firstEntry = editor.batchEntries[0];
	const activeEntry = editor.batchEntries[1];
	const activeIds = activeEntry.stickers.map((sticker) => sticker.id);
	expect(editor.reorderSticker(activeIds[2], 0)).toBe(true);
	editor.syncActiveBatch();
	expect(editor.batchEntries[1].stickers.map((sticker) => sticker.id)).toEqual([
		activeIds[2],
		activeIds[0],
		activeIds[1]
	]);
	expect(editor.batchStickers.map((sticker) => sticker.id)).toEqual([
		...firstEntry.stickers.map((sticker) => sticker.id),
		activeIds[2],
		activeIds[0],
		activeIds[1]
	]);
});

it('keeps adjusted sticker pixels and bounds in the active batch export data', async () => {
	editor.addBatchFiles([file()]);
	await vi.waitFor(() => expect(editor.batchEntries[0]?.status).toBe('done'));
	const original = editor.batchStickers[0];
	const bounds = { ...original.bbox, x: original.bbox.x + 1, width: original.bbox.width - 1 };

	editor.updateStickerBounds(original.id, bounds);
	editor.syncActiveBatch();

	expect(editor.batchStickers[0].bbox).toEqual(bounds);
	expect(editor.batchStickers[0].pixels).not.toBe(original.pixels);
});

it('keeps successful results when another image fails and retries only the failed row', async () => {
	vi.mocked(detector.detect).mockRejectedValueOnce(new Error('temporary failure'));
	editor.addBatchFiles([
		new File([], 'recover.png', { type: 'image/png' }),
		new File([], 'success.png', { type: 'image/png' })
	]);
	await vi.waitFor(() => expect(editor.batchEntries[1]?.status).toBe('done'));
	expect(editor.batchEntries[0]?.status).toBe('error');
	expect(editor.batchStickers).toHaveLength(3);
	editor.retryBatchEntry(editor.batchEntries[0].id);
	await vi.waitFor(() => expect(editor.batchEntries[0]?.status).toBe('done'));
	expect(editor.batchStickers).toHaveLength(6);
});

it('cancels queued images after the current image and removes one image result independently', async () => {
	editor.addBatchFiles([
		new File([], 'current.png', { type: 'image/png' }),
		new File([], 'pending.png', { type: 'image/png' })
	]);
	editor.cancelBatch();
	await vi.waitFor(() => expect(editor.batchEntries[0]?.status).toBe('done'));
	expect(editor.batchEntries[1]?.status).toBe('cancelled');
	expect(editor.batchStickers).toHaveLength(3);
	editor.removeBatchEntry(editor.batchEntries[0].id);
	expect(editor.batchStickers).toHaveLength(0);
});

it('rejects a complete image result that would exceed the bounded sticker capacity', async () => {
	editor.dispose();
	detector = createMockDetector({ count: 7 });
	vi.spyOn(detector, 'detect');
	vi.spyOn(detector, 'dispose');
	editor = createEditorState({ detector, decode });
	editor.addBatchFiles(
		Array.from(
			{ length: 9 },
			(_, index) => new File([], `sheet-${index + 1}.png`, { type: 'image/png' })
		)
	);
	await vi.waitFor(() => expect(editor.batchEntries[8]?.status).toBe('error'));
	expect(editor.batchEntries[8]?.error).toBe('BatchLimitExceeded');
	expect(editor.batchStickers).toHaveLength(56);
});

it('caps the number of retained source files at ten', async () => {
	editor.addBatchFiles(
		Array.from(
			{ length: 11 },
			(_, index) => new File([], `sheet-${index + 1}.png`, { type: 'image/png' })
		)
	);
	expect(editor.batchEntries).toHaveLength(10);
	expect(editor.lastError).toBe('BatchLimitExceeded');
	await vi.waitFor(() =>
		expect(editor.batchEntries.every((entry) => entry.status === 'done')).toBe(true)
	);
});
