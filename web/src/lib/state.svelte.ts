import { SvelteSet } from 'svelte/reactivity';
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

export type EditorStatus = 'idle' | 'decoding' | 'detecting' | 'ready' | 'error';
export type EditorErrorCode = DetectionErrorCode | 'UnsupportedFile' | 'DecodeFailed' | 'Unknown';
export interface SourceImage extends DecodedImage {
	name: string;
	url: string;
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
	splitUndo = $state.raw<Array<{ original: Sticker; replacements: Sticker[] }>>([]);
	status = $state<EditorStatus>('idle');
	lastError = $state<EditorErrorCode | null>(null);
	errorSequence = $state(0);
	private pendingDebounce = $state(false);
	readonly stickers = $derived(this.detected.filter((sticker) => !this.removedIds.has(sticker.id)));
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
	private readonly detector: Detector;
	private readonly decode: (blob: Blob) => Promise<DecodedImage>;
	private readonly debounceMs: number;

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
			url: URL.createObjectURL(blob)
		};
		this.detected = [];
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
			this.splitPreview = null;
			this.splitBusyId = null;
			this.noSplitProposalId = null;
			this.splitUndo = [];
			this.removedIds.clear();
			this.trayIconId = result[0]?.id ?? null;
			this.status = 'ready';
		} catch (error) {
			if (sequence !== this.sequence || this.disposed || isCancelled(error)) return;
			this.detected = [];
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
		if (this.splitPreview?.source.id === id) this.splitPreview = null;
		if (this.noSplitProposalId === id) this.noSplitProposalId = null;
		this.removedIds.add(id);
		if (this.trayIconId === id) this.trayIconId = this.stickers[0]?.id ?? null;
	}

	async requestSplit(id: string): Promise<void> {
		const source = this.stickers.find((sticker) => sticker.id === id);
		if (!source || this.disposed || this.splitBusyId) return;
		this.splitPreview = null;
		this.noSplitProposalId = null;
		this.splitBusyId = id;
		try {
			const candidates = await this.detector.proposeSplit(source.pixels);
			if (this.disposed || !this.stickers.some((sticker) => sticker.id === id)) return;
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
		this.detected = [
			...this.detected.slice(0, sourceIndex),
			...replacements,
			...this.detected.slice(sourceIndex + 1)
		].map((sticker, index) => ({ ...sticker, index }));
		this.splitUndo = [...this.splitUndo, { original: proposal.source, replacements }];
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
		this.detected = [
			...this.detected.slice(0, firstIndex),
			group.original,
			...this.detected.slice(firstIndex).filter((sticker) => !replacementIds.has(sticker.id))
		].map((sticker, index) => ({ ...sticker, index }));
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
		this.clearDebounce();
		if (this.source) URL.revokeObjectURL(this.source.url);
		this.source = null;
		this.splitPreview = null;
		this.splitBusyId = null;
		this.noSplitProposalId = null;
		this.splitUndo = [];
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
