import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import {
	createDetector,
	DetectionError,
	isCancelled,
	type DetectionErrorCode,
	type Detector,
	type Rgb,
	type Sticker
} from '$lib/detection';
import { decodeImage, type DecodedImage } from '$lib/tool/decode';
import { applyStickerOrder, moveStickerById } from '$lib/tool/sticker-order';
import { adjustStickerBounds } from '$lib/tool/bounds';

export type EditorStatus = 'idle' | 'decoding' | 'detecting' | 'ready' | 'error';
export type EditorErrorCode =
	DetectionErrorCode | 'UnsupportedFile' | 'DecodeFailed' | 'BatchLimitExceeded' | 'Unknown';
export type BatchStatus = 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
export interface BatchEntry {
	id: string;
	file: File;
	status: BatchStatus;
	error: EditorErrorCode | null;
	stickers: Sticker[];
	trayIconId: string | null;
}
export const MAX_BATCH_IMAGES = 10;
export const MAX_BATCH_STICKERS = 60;
export interface SourceImage extends DecodedImage {
	name: string;
	url: string;
	file: Blob;
}

function mapSplitBox(candidate: Sticker['bbox'], source: Sticker['bbox']): Sticker['bbox'] {
	const contentWidth =
		source.width >= source.height
			? 480
			: Math.max(1, Math.round((source.width * 480) / source.height));
	const contentHeight =
		source.height >= source.width
			? 480
			: Math.max(1, Math.round((source.height * 480) / source.width));
	const marginX = Math.floor((512 - contentWidth) / 2);
	const marginY = Math.floor((512 - contentHeight) / 2);
	const mapStart = (coordinate: number, margin: number, content: number, extent: number) =>
		Math.floor((Math.max(0, Math.min(content, coordinate - margin)) * extent) / content);
	const mapEnd = (coordinate: number, margin: number, content: number, extent: number) =>
		Math.ceil((Math.max(0, Math.min(content, coordinate - margin)) * extent) / content);
	const left = mapStart(candidate.x, marginX, contentWidth, source.width);
	const top = mapStart(candidate.y, marginY, contentHeight, source.height);
	const right = mapEnd(candidate.x + candidate.width, marginX, contentWidth, source.width);
	const bottom = mapEnd(candidate.y + candidate.height, marginY, contentHeight, source.height);
	return {
		x: source.x + left,
		y: source.y + top,
		width: Math.max(1, right - left),
		height: Math.max(1, bottom - top)
	};
}
interface Dependencies {
	detector: Detector;
	decode?: (blob: Blob) => Promise<DecodedImage>;
	debounceMs?: number;
}

export class EditorState {
	source = $state.raw<SourceImage | null>(null);
	detected = $state.raw<Sticker[]>([]);
	removedIds = new SvelteSet<string>();
	tolerance = $state(50);
	background = $state<Rgb>({ r: 0, g: 177, b: 64 });
	trayIconId = $state<string | null>(null);
	splitPreview = $state.raw<{ source: Sticker; candidates: Sticker[] } | null>(null);
	splitBusyId = $state<string | null>(null);
	noSplitProposalId = $state<string | null>(null);
	splitUndo = $state.raw<
		Array<{ original: Sticker; replacements: Sticker[]; brushResetPixels?: ImageData }>
	>([]);
	status = $state<EditorStatus>('idle');
	completedRunSequence = $state(0);
	lastError = $state<EditorErrorCode | null>(null);
	errorSequence = $state(0);
	batchEntries = $state.raw<BatchEntry[]>([]);
	activeBatchId = $state<string | null>(null);
	batchRunning = $state(false);
	private pendingDebounce = $state(false);
	private stickerOrder = $state.raw<string[]>([]);
	readonly stickers = $derived(
		applyStickerOrder(
			this.detected.filter((sticker) => !this.removedIds.has(sticker.id)),
			this.stickerOrder
		)
	);
	readonly batchStickers = $derived(
		this.batchEntries.length ? this.batchEntries.flatMap((entry) => entry.stickers) : this.stickers
	);
	readonly batchTrayIconId = $derived(
		(this.status === 'ready' ? this.trayIconId : null) ??
			this.batchEntries.find((entry) => entry.id === this.activeBatchId)?.trayIconId ??
			this.batchEntries.find((entry) => entry.status === 'done')?.trayIconId ??
			this.batchStickers[0]?.id ??
			null
	);
	readonly undoableStickerIds = $derived(
		new SvelteSet(
			this.splitUndo.flatMap((group) => group.replacements.map((sticker) => sticker.id))
		)
	);
	readonly isProcessing = $derived(
		this.pendingDebounce || this.status === 'decoding' || this.status === 'detecting'
	);
	private sequence = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private disposed = false;
	private batchSequence = 0;
	private batchCancelRequested = false;
	private batchIdSequence = 0;
	private readonly detector: Detector;
	private readonly decode: (blob: Blob) => Promise<DecodedImage>;
	private readonly debounceMs: number;
	private readonly brushResetPixelsById = new SvelteMap<string, ImageData>();

	constructor({ detector, decode = decodeImage, debounceMs = 300 }: Dependencies) {
		this.detector = detector;
		this.decode = decode;
		this.debounceMs = debounceMs;
	}

	rejectFile(): void {
		this.reportError('UnsupportedFile');
	}

	private reportError(code: EditorErrorCode): void {
		this.lastError = code;
		this.errorSequence++;
	}

	private updateBatchEntry(id: string, patch: Partial<BatchEntry>): void {
		this.batchEntries = this.batchEntries.map((entry) =>
			entry.id === id ? { ...entry, ...patch } : entry
		);
	}

	addBatchFiles(files: File[]): void {
		if (this.disposed || !files.length) return;
		const images = files.filter((file) => file.type.startsWith('image/'));
		if (images.length !== files.length) this.rejectFile();
		const capacity = MAX_BATCH_IMAGES - this.batchEntries.length;
		if (images.length > capacity) this.reportError('BatchLimitExceeded');
		const accepted = images.slice(0, Math.max(0, capacity));
		if (!accepted.length) return;
		const additions = accepted.map((file) => ({
			id: `batch-${++this.batchIdSequence}`,
			file,
			status: 'queued' as const,
			error: null,
			stickers: [],
			trayIconId: null
		}));
		this.batchEntries = [...this.batchEntries, ...additions];
		this.activeBatchId ??= additions[0]?.id ?? null;
		void this.processBatchQueue();
	}

	private async processBatchQueue(): Promise<void> {
		if (this.batchRunning || this.disposed) return;
		this.batchRunning = true;
		this.batchCancelRequested = false;
		const run = ++this.batchSequence;
		try {
			while (run === this.batchSequence && !this.disposed) {
				if (this.batchCancelRequested) {
					this.batchEntries = this.batchEntries.map((entry) =>
						entry.status === 'queued' ? { ...entry, status: 'cancelled' } : entry
					);
					break;
				}
				const entry = this.batchEntries.find((candidate) => candidate.status === 'queued');
				if (!entry) break;
				const previousStickers = entry.stickers;
				const previousTrayIconId = entry.trayIconId;
				this.activeBatchId = entry.id;
				this.updateBatchEntry(entry.id, { status: 'processing', error: null });
				await this.loadFile(entry.file);
				if (run !== this.batchSequence || this.disposed) break;
				if (this.status === 'ready') {
					const previousCount = this.batchEntries
						.filter((candidate) => candidate.id !== entry.id && candidate.status === 'done')
						.reduce((total, candidate) => total + candidate.stickers.length, 0);
					if (previousCount + this.stickers.length > MAX_BATCH_STICKERS) {
						this.detected = [];
						this.status = 'error';
						this.reportError('BatchLimitExceeded');
						this.updateBatchEntry(entry.id, {
							status: 'error',
							error: 'BatchLimitExceeded',
							stickers: previousStickers,
							trayIconId: previousTrayIconId
						});
					} else {
						this.updateBatchEntry(entry.id, {
							status: 'done',
							error: null,
							stickers: [...this.stickers],
							trayIconId: this.trayIconId
						});
					}
				} else {
					this.updateBatchEntry(entry.id, {
						status: 'error',
						error: this.lastError ?? 'Unknown',
						stickers: previousStickers,
						trayIconId: previousTrayIconId
					});
				}
			}
		} finally {
			if (run === this.batchSequence) this.batchRunning = false;
		}
	}

	retryBatchEntry(id: string): void {
		const entry = this.batchEntries.find((candidate) => candidate.id === id);
		if (!entry || !['error', 'cancelled'].includes(entry.status) || this.batchRunning) return;
		this.updateBatchEntry(id, { status: 'queued', error: null });
		void this.processBatchQueue();
	}

	activateBatchEntry(id: string): void {
		const entry = this.batchEntries.find((candidate) => candidate.id === id);
		if (!entry || entry.status !== 'done' || this.batchRunning) return;
		this.activeBatchId = id;
		this.updateBatchEntry(id, { status: 'queued' });
		void this.processBatchQueue();
	}

	cancelBatch(): void {
		if (!this.batchRunning) return;
		this.batchCancelRequested = true;
		this.batchEntries = this.batchEntries.map((entry) =>
			entry.status === 'queued' ? { ...entry, status: 'cancelled' } : entry
		);
	}

	removeBatchEntry(id: string): void {
		if (!this.batchEntries.some((entry) => entry.id === id)) return;
		this.batchEntries = this.batchEntries.filter((entry) => entry.id !== id);
		if (this.activeBatchId === id && !this.batchRunning) {
			const next = this.batchEntries.find((entry) => entry.status === 'done');
			this.activeBatchId = next?.id ?? null;
			this.clearActiveImage();
			if (next) this.activateBatchEntry(next.id);
		}
	}

	clearBatch(): void {
		this.cancelBatch();
		this.batchSequence++;
		this.batchRunning = false;
		this.batchEntries = [];
		this.activeBatchId = null;
		this.clearActiveImage();
	}

	syncActiveBatch(): void {
		const active = this.batchEntries.find((entry) => entry.id === this.activeBatchId);
		if (!active || active.status !== 'done' || this.status !== 'ready') return;
		const stickersChanged =
			active.stickers.length !== this.stickers.length ||
			active.stickers.some(
				(sticker, index) =>
					sticker.id !== this.stickers[index]?.id || sticker.pixels !== this.stickers[index]?.pixels
			);
		if (!stickersChanged && active.trayIconId === this.trayIconId) return;
		this.updateBatchEntry(active.id, { stickers: [...this.stickers], trayIconId: this.trayIconId });
	}

	private clearActiveImage(): void {
		++this.sequence;
		this.clearDebounce();
		if (this.source) URL.revokeObjectURL(this.source.url);
		this.source = null;
		this.detected = [];
		this.stickerOrder = [];
		this.removedIds.clear();
		this.trayIconId = null;
		this.splitPreview = null;
		this.splitBusyId = null;
		this.noSplitProposalId = null;
		this.splitUndo = [];
		this.brushResetPixelsById.clear();
		this.status = 'idle';
	}

	private clearDebounce(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
		this.pendingDebounce = false;
	}

	async loadFile(blob: Blob): Promise<void> {
		if (this.disposed) return;
		if (!blob.type.startsWith('image/')) {
			this.rejectFile();
			return;
		}
		this.clearDebounce();
		const sequence = ++this.sequence;
		this.status = 'decoding';
		let decoded: DecodedImage;
		try {
			decoded = await this.decode(blob);
		} catch {
			if (sequence !== this.sequence || this.disposed) return;
			this.status = this.source ? (this.detected.length ? 'ready' : 'error') : 'idle';
			this.reportError('DecodeFailed');
			return;
		}
		if (sequence !== this.sequence || this.disposed) return;
		if (this.source) URL.revokeObjectURL(this.source.url);
		this.source = {
			...decoded,
			name: blob instanceof File ? blob.name : '',
			file: blob,
			url: URL.createObjectURL(blob)
		};
		this.detected = [];
		this.brushResetPixelsById.clear();
		this.splitPreview = null;
		this.splitBusyId = null;
		this.noSplitProposalId = null;
		this.splitUndo = [];
		this.removedIds.clear();
		this.trayIconId = null;
		await this.runDetection();
	}

	setTolerance(value: number): void {
		if (this.disposed) return;
		this.tolerance = Math.max(0, Math.min(100, Math.round(value)));
		this.clearDebounce();
		if (!this.source || this.status === 'decoding') return;
		++this.sequence;
		this.pendingDebounce = true;
		this.timer = setTimeout(() => {
			this.clearDebounce();
			void this.runDetection();
		}, this.debounceMs);
	}

	setBackground(color: Rgb): void {
		if (this.disposed) return;
		this.background = { ...color };
		this.clearDebounce();
		if (this.source && this.status !== 'decoding') void this.runDetection();
	}

	private async runDetection(): Promise<void> {
		if (!this.source || this.disposed) return;
		const sequence = ++this.sequence;
		this.status = 'detecting';
		this.lastError = null;
		try {
			const result = await this.detector.detect(this.source.imageData, {
				tolerance: this.tolerance,
				background: { ...this.background }
			});
			if (sequence !== this.sequence || this.disposed) return;
			this.detected = result;
			this.brushResetPixelsById.clear();
			this.stickerOrder = result.map((sticker) => sticker.id);
			this.splitPreview = null;
			this.splitBusyId = null;
			this.noSplitProposalId = null;
			this.splitUndo = [];
			this.removedIds.clear();
			this.trayIconId = result[0]?.id ?? null;
			this.status = 'ready';
			this.completedRunSequence++;
		} catch (error) {
			if (sequence !== this.sequence || this.disposed || isCancelled(error)) return;
			this.detected = [];
			this.brushResetPixelsById.clear();
			this.stickerOrder = [];
			this.splitPreview = null;
			this.splitBusyId = null;
			this.noSplitProposalId = null;
			this.splitUndo = [];
			this.removedIds.clear();
			this.trayIconId = null;
			this.status = 'error';
			this.reportError(error instanceof DetectionError ? error.code : 'Unknown');
		}
	}

	removeSticker(id: string): void {
		if (!this.stickers.some((sticker) => sticker.id === id)) return;
		this.brushResetPixelsById.delete(id);
		if (this.splitPreview?.source.id === id) this.splitPreview = null;
		if (this.noSplitProposalId === id) this.noSplitProposalId = null;
		this.removedIds.add(id);
		this.stickerOrder = this.stickerOrder.filter((stickerId) => stickerId !== id);
		if (this.trayIconId === id) this.trayIconId = this.stickers[0]?.id ?? null;
	}

	reorderSticker(id: string, toIndex: number): boolean {
		if (this.isProcessing) return false;
		const current = this.stickers;
		const fromIndex = current.findIndex((sticker) => sticker.id === id);
		if (fromIndex < 0 || !Number.isInteger(toIndex) || toIndex < 0 || toIndex >= current.length)
			return false;
		if (fromIndex === toIndex) return false;
		this.stickerOrder = moveStickerById(current, id, toIndex).map((sticker) => sticker.id);
		return true;
	}

	updateStickerBounds(id: string, bounds: Sticker['bbox']): void {
		const current = this.stickers.find((sticker) => sticker.id === id);
		const source = this.source;
		if (!current || !source || this.disposed) return;
		const adjusted = adjustStickerBounds(current, bounds, source.width, source.height);
		if (!adjusted || adjusted === current) return;
		this.detected = this.detected.map((sticker) => (sticker.id === id ? adjusted : sticker));
		const resetPixels = this.brushResetPixelsById.get(id);
		if (resetPixels) {
			const adjustedReset = adjustStickerBounds(
				{ ...current, pixels: resetPixels },
				bounds,
				source.width,
				source.height
			);
			if (adjustedReset) this.brushResetPixelsById.set(id, adjustedReset.pixels);
		}
		this.splitUndo = this.splitUndo.map((group) => ({
			...group,
			replacements: group.replacements.map((sticker) => (sticker.id === id ? adjusted : sticker))
		}));
		if (this.splitPreview?.source.id === id) this.splitPreview = null;
		if (this.noSplitProposalId === id) this.noSplitProposalId = null;
	}

	updateStickerPixels(id: string, pixels: ImageData): void {
		const current = this.stickers.find((sticker) => sticker.id === id);
		if (
			!current ||
			this.disposed ||
			pixels.width !== current.pixels.width ||
			pixels.height !== current.pixels.height ||
			pixels.data.length !== pixels.width * pixels.height * 4
		)
			return;
		if (!this.brushResetPixelsById.has(id)) this.brushResetPixelsById.set(id, current.pixels);
		const updated = { ...current, pixels };
		this.detected = this.detected.map((sticker) => (sticker.id === id ? updated : sticker));
		this.splitUndo = this.splitUndo.map((group) => ({
			...group,
			replacements: group.replacements.map((sticker) => (sticker.id === id ? updated : sticker))
		}));
		if (this.splitPreview?.source.id === id) this.splitPreview = null;
		if (this.noSplitProposalId === id) this.noSplitProposalId = null;
	}

	brushResetPixels(id: string): ImageData | undefined {
		return (
			this.brushResetPixelsById.get(id) ??
			this.stickers.find((sticker) => sticker.id === id)?.pixels
		);
	}

	async requestSplit(id: string): Promise<void> {
		const source = this.stickers.find((sticker) => sticker.id === id);
		if (!source || this.disposed || this.splitBusyId) return;
		this.splitPreview = null;
		this.noSplitProposalId = null;
		this.splitBusyId = id;
		try {
			const candidates = await this.detector.proposeSplit(source.pixels);
			if (
				this.disposed ||
				this.stickers.find((sticker) => sticker.id === id)?.pixels !== source.pixels
			)
				return;
			if (candidates.length < 2) {
				this.noSplitProposalId = id;
				return;
			}
			this.splitPreview = { source, candidates };
		} catch (error) {
			if (this.disposed || isCancelled(error)) return;
			this.reportError(error instanceof DetectionError ? error.code : 'Unknown');
		} finally {
			if (this.splitBusyId === id) this.splitBusyId = null;
		}
	}

	discardSplit(): void {
		this.splitPreview = null;
	}

	acceptSplit(): void {
		const proposal = this.splitPreview;
		if (!proposal || !this.stickers.some((sticker) => sticker.id === proposal.source.id)) return;
		const sourceIndex = this.detected.findIndex((sticker) => sticker.id === proposal.source.id);
		if (sourceIndex < 0) return;
		const replacements = proposal.candidates.map((candidate, index) => ({
			...candidate,
			index: sourceIndex + index,
			bbox: mapSplitBox(candidate.bbox, proposal.source.bbox)
		}));
		const ordered = this.stickers.map((sticker) => sticker.id);
		const orderIndex = ordered.indexOf(proposal.source.id);
		if (orderIndex >= 0) {
			ordered.splice(orderIndex, 1, ...replacements.map((sticker) => sticker.id));
			this.stickerOrder = ordered;
		}
		this.detected = [
			...this.detected.slice(0, sourceIndex),
			...replacements,
			...this.detected.slice(sourceIndex + 1)
		].map((sticker, index) => ({ ...sticker, index }));
		const brushResetPixels = this.brushResetPixelsById.get(proposal.source.id);
		this.brushResetPixelsById.delete(proposal.source.id);
		this.splitUndo = [
			...this.splitUndo,
			{ original: proposal.source, replacements, brushResetPixels }
		];
		this.removedIds.delete(proposal.source.id);
		if (this.trayIconId === proposal.source.id) this.trayIconId = replacements[0]?.id ?? null;
		this.splitPreview = null;
		this.noSplitProposalId = null;
	}

	undoSplit(id: string): void {
		const groupIndex = this.splitUndo.findIndex((group) =>
			group.replacements.some((sticker) => sticker.id === id)
		);
		if (groupIndex < 0) return;
		const group = this.splitUndo[groupIndex];
		const descendants = new SvelteSet<string>();
		const collectDescendants = (parentIds: string[]) => {
			for (const childGroup of this.splitUndo) {
				if (!childGroup.original || !parentIds.includes(childGroup.original.id)) continue;
				for (const replacement of childGroup.replacements) {
					if (descendants.has(replacement.id)) continue;
					descendants.add(replacement.id);
					collectDescendants([replacement.id]);
				}
			}
		};
		collectDescendants(group.replacements.map((sticker) => sticker.id));
		const replacementIds = new SvelteSet([
			...group.replacements.map((sticker) => sticker.id),
			...descendants
		]);
		const firstIndex = this.detected.findIndex((sticker) => replacementIds.has(sticker.id));
		if (firstIndex < 0) return;
		const affectedIds = new SvelteSet([group.original.id, ...replacementIds]);
		const currentOrder = this.stickers.map((sticker) => sticker.id);
		let orderIndex = currentOrder.findIndex((stickerId) => replacementIds.has(stickerId));
		if (orderIndex < 0) {
			orderIndex = currentOrder.findIndex((stickerId) => {
				const detectedIndex = this.detected.findIndex((sticker) => sticker.id === stickerId);
				return detectedIndex >= firstIndex;
			});
			if (orderIndex < 0) orderIndex = currentOrder.length;
		}
		const restoredOrder = currentOrder.filter((stickerId) => !replacementIds.has(stickerId));
		const insertionIndex = currentOrder
			.slice(0, orderIndex)
			.filter((stickerId) => !replacementIds.has(stickerId)).length;
		restoredOrder.splice(insertionIndex, 0, group.original.id);
		this.detected = [
			...this.detected.slice(0, firstIndex),
			group.original,
			...this.detected.slice(firstIndex).filter((sticker) => !replacementIds.has(sticker.id))
		].map((sticker, index) => ({ ...sticker, index }));
		for (const replacementId of replacementIds) this.brushResetPixelsById.delete(replacementId);
		if (group.brushResetPixels) {
			this.brushResetPixelsById.set(group.original.id, group.brushResetPixels);
		}
		this.splitUndo = this.splitUndo.filter(
			(_, index) => index !== groupIndex && !affectedIds.has(this.splitUndo[index].original.id)
		);
		if (this.splitPreview && affectedIds.has(this.splitPreview.source.id)) this.splitPreview = null;
		if (this.noSplitProposalId && affectedIds.has(this.noSplitProposalId))
			this.noSplitProposalId = null;
		if (this.splitBusyId && affectedIds.has(this.splitBusyId)) {
			this.splitBusyId = null;
			++this.sequence;
		}
		for (const affectedId of affectedIds) this.removedIds.delete(affectedId);
		this.stickerOrder = restoredOrder;
		if (affectedIds.has(this.trayIconId ?? '')) {
			this.trayIconId = group.original.id;
		}
	}

	setTrayIcon(id: string): void {
		if (this.stickers.some((sticker) => sticker.id === id)) this.trayIconId = id;
	}

	dispose(): void {
		this.disposed = true;
		++this.sequence;
		this.batchSequence++;
		this.batchSequence++;
		this.clearDebounce();
		if (this.source) URL.revokeObjectURL(this.source.url);
		this.source = null;
		this.splitPreview = null;
		this.splitBusyId = null;
		this.noSplitProposalId = null;
		this.splitUndo = [];
		this.brushResetPixelsById.clear();
		this.status = 'idle';
		this.detector.dispose();
	}
}

export function createEditorState(dependencies: Dependencies): EditorState {
	return new EditorState(dependencies);
}

let editor: EditorState | null = null;
/** Browser-session state, intentionally retained across page and locale remounts. */
export function getEditor(): EditorState {
	return (editor ??= createEditorState({ detector: createDetector() }));
}
/** Test-only injection; the caller owns disposal of injected editors. */
export function setEditorForTesting(value: EditorState | null): void {
	editor = value;
}
