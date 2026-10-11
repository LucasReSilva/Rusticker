import { untrack } from 'svelte';
import type { Sticker } from '$lib/detection/types';
import { exportPacks } from './export';
import { splitIntoPacks } from './split';
import type { Encoder, ExportProgress, ExportResult, PackArchive, StickerSizes } from './types';

interface Snapshot {
	stickers: Sticker[];
	trayIconId: string | null;
}
export interface ControllerDependencies {
	getStickers: () => Sticker[];
	getTrayIconId: () => string | null;
	isDetecting: () => boolean;
	sizes: StickerSizes;
	encoder: Encoder;
	download: (blob: Blob, fileName: string) => void | Promise<void>;
	pause?: () => Promise<void>;
}

export function createExportController(deps: ControllerDependencies) {
	let phase = $state<'idle' | 'exporting' | 'done' | 'error'>('idle');
	let progress = $state<ExportProgress>({ done: 0, total: 0 });
	let archives = $state.raw<PackArchive[]>([]);
	let saved: Snapshot | undefined;
	let lastResult: ExportResult | undefined;
	let active: Snapshot | undefined;
	let invalidated = false;
	const snapshot = (): Snapshot => ({
		stickers: deps.getStickers().map((sticker) => ({ ...sticker })),
		trayIconId: deps.getTrayIconId()
	});
	const matches = (value: Snapshot): boolean => {
		const current = deps.getStickers();
		return (
			value.trayIconId === deps.getTrayIconId() &&
			current.length === value.stickers.length &&
			current.every(
				(sticker, i) =>
					sticker.id === value.stickers[i].id && sticker.pixels === value.stickers[i].pixels
			)
		);
	};
	$effect(() => {
		// Track list, order, ids, pixel identity, and the selected tray icon.
		const current = snapshot();
		const detecting = deps.isDetecting();
		current.stickers.forEach((sticker) => {
			void sticker.id;
			void sticker.pixels;
		});
		untrack(() => {
			if (active && (!matches(active) || detecting)) invalidated = true;
			if (saved && !matches(saved)) {
				archives = [];
				lastResult = undefined;
				saved = undefined;
				if (phase !== 'exporting') phase = 'idle';
			}
		});
		// Changing locale or leaving the tool destroys the component's effect scope.
		return () => {
			if (active) invalidated = true;
		};
	});
	const blockedReason = () => {
		if (phase === 'exporting') return 'Exporting' as const;
		if (deps.isDetecting()) return 'Detecting' as const;
		if (deps.getStickers().length < 3) return 'TooFewStickers' as const;
		return null;
	};
	return {
		get phase() {
			return phase;
		},
		get progress() {
			return progress;
		},
		get plan() {
			const stickers = deps.getStickers();
			return {
				stickerCount: stickers.length,
				packSizes: splitIntoPacks(stickers).map((pack) => pack.length)
			};
		},
		get canExport() {
			return blockedReason() === null;
		},
		get blockedReason() {
			return blockedReason();
		},
		get archives() {
			return saved && matches(saved) ? archives : [];
		},
		async exportAll(): Promise<ExportResult | undefined> {
			if (blockedReason()) return;
			const input = snapshot();
			active = input;
			invalidated = false;
			const valid = () => !invalidated && matches(input) && !deps.isDetecting();
			phase = 'exporting';
			progress = { done: 0, total: input.stickers.length + splitIntoPacks(input.stickers).length };
			try {
				const result =
					saved && matches(saved) && lastResult
						? lastResult
						: await exportPacks(input.stickers, input.trayIconId, {
								sizes: deps.sizes,
								encoder: deps.encoder,
								onProgress: (value) => {
									if (valid()) progress = value;
								}
							});
				if (!valid()) {
					phase = 'idle';
					return;
				}
				saved = input;
				lastResult = result;
				archives = result.archives;
				for (const [index, archive] of result.archives.entries()) {
					if (index > 0)
						await (deps.pause?.() ?? new Promise((resolve) => setTimeout(resolve, 400)));
					// Every download, including after a gap, belongs to the current input.
					if (!valid()) {
						phase = 'idle';
						return;
					}
					await deps.download(archive.blob, archive.fileName);
				}
				phase = 'done';
				return result;
			} catch (error) {
				phase = valid() ? 'error' : 'idle';
				if (valid()) throw error;
				return;
			} finally {
				active = undefined;
			}
		},
		async downloadPack(index: number): Promise<void> {
			if (blockedReason() || !saved || !matches(saved)) return;
			const archive = archives[index];
			if (archive) await deps.download(archive.blob, archive.fileName);
		}
	};
}
