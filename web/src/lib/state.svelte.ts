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
	status = $state<EditorStatus>('idle');
	lastError = $state<EditorErrorCode | null>(null);
	errorSequence = $state(0);
	private pendingDebounce = $state(false);
	readonly stickers = $derived(this.detected.filter((sticker) => !this.removedIds.has(sticker.id)));
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
			this.removedIds.clear();
			this.trayIconId = result[0]?.id ?? null;
			this.status = 'ready';
		} catch (error) {
			if (sequence !== this.sequence || this.disposed || isCancelled(error)) return;
			this.detected = [];
			this.removedIds.clear();
			this.trayIconId = null;
			this.status = 'error';
			this.reportError(error instanceof DetectionError ? error.code : 'Unknown');
		}
	}

	removeSticker(id: string): void {
		if (!this.stickers.some((sticker) => sticker.id === id)) return;
		this.removedIds.add(id);
		if (this.trayIconId === id) this.trayIconId = this.stickers[0]?.id ?? null;
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
