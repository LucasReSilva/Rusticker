import { untrack } from 'svelte';
import type { Sticker } from '$lib/detection/types';
import { exportPacks } from './export';
import { splitIntoPacks } from './split';
import { createExportSession, type ExportSession } from './session';
import { captureExportInput, matchesExportInput, type ExportInput } from './input';
import type { Encoder, ExportProgress, ExportResult, PackArchive, StickerSizes } from './types';

export interface ControllerDependencies {
	getStickers: () => Sticker[];
	getTrayIconId: () => string | null;
	isDetecting: () => boolean;
	sizes: StickerSizes;
	encoder: Encoder;
	download: (blob: Blob, fileName: string) => void | Promise<void>;
	pause?: () => Promise<void>;
	session?: ExportSession;
}

export function createExportController(deps: ControllerDependencies) {
	const snapshot = () => captureExportInput(deps.getStickers(), deps.getTrayIconId());
	const session = deps.session ?? createExportSession();
	const initialInput = snapshot();
	const initialResult = session.get(initialInput.stickers, initialInput.trayIconId);
	let phase = $state<'idle' | 'exporting' | 'done' | 'error'>(initialResult ? 'done' : 'idle');
	const initialTotal = initialResult ? initialResult.stickerCount + initialResult.packCount : 0;
	let progress = $state<ExportProgress>({ done: initialTotal, total: initialTotal });
	let archives = $state.raw<PackArchive[]>(initialResult?.archives ?? []);
	let saved = $state.raw<ExportInput | undefined>(initialResult ? initialInput : undefined);
	let active: ExportInput | undefined;
	let invalidated = false;
	const matches = (value: ExportInput) =>
		matchesExportInput(value, deps.getStickers(), deps.getTrayIconId());
	$effect(() => {
		// Track list, order, ids, pixel identity, and the selected tray icon.
		snapshot();
		const detecting = deps.isDetecting();
		untrack(() => {
			if (active && (!matches(active) || detecting)) invalidated = true;
			if (saved && !matches(saved)) {
				archives = [];
				session.clear();
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
					session.get(input.stickers, input.trayIconId) ??
					(await exportPacks(input.stickers, input.trayIconId, {
						sizes: deps.sizes,
						encoder: deps.encoder,
						onProgress: (value) => {
							if (valid()) progress = value;
						}
					}));
				if (!valid()) {
					phase = 'idle';
					return;
				}
				saved = input;
				session.set(input.stickers, input.trayIconId, result);
				archives = result.archives;
				progress = { done: progress.total, total: progress.total };
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
				if (!valid()) {
					phase = 'idle';
					return;
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
