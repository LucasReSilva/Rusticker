import type { Sticker } from '$lib/detection/types';
import { packFileName, stickerPngName, stickerWebpName, TRAY_ICON_NAME } from './names';
import { splitIntoPacks } from './split';
import { pickTrayIconSticker } from './tray';
import {
	ExportError,
	type Encoder,
	type ExportProgress,
	type ExportResult,
	type StickerSizes
} from './types';
import { buildPackZip, type ZipEntry } from './zip';

export interface ExportDependencies {
	sizes: StickerSizes;
	encoder: Encoder;
	onProgress?: (progress: ExportProgress) => void;
}

export async function exportPacks(
	stickers: Sticker[],
	trayIconId: string | null,
	deps: ExportDependencies
): Promise<ExportResult> {
	const packs = splitIntoPacks(stickers);
	if (!packs.length) throw new ExportError('TooFewStickers');
	const total = stickers.length + packs.length;
	let done = 0;
	const progress = () => deps.onProgress?.({ done, total });
	progress();
	try {
		const files = new Map<Sticker, { webp: Blob; png: Blob }>();
		let overBudgetCount = 0;
		for (const sticker of stickers) {
			const encoded = await deps.sizes.encoded(sticker);
			const png = await deps.encoder.png(sticker.pixels);
			files.set(sticker, { webp: encoded.blob, png });
			if (encoded.overLimit) overBudgetCount++;
			done++;
			progress();
		}
		const tray = await deps.encoder.trayIcon(pickTrayIconSticker(stickers, trayIconId).pixels);
		const archives = [];
		for (const [index, pack] of packs.entries()) {
			const entries: ZipEntry[] = [];
			for (const [position, sticker] of pack.entries()) {
				const file = files.get(sticker)!;
				entries.push({ name: stickerWebpName(position + 1), blob: file.webp });
				entries.push({ name: stickerPngName(position + 1), blob: file.png });
			}
			entries.push({ name: TRAY_ICON_NAME, blob: tray });
			archives.push({
				fileName: packFileName(index + 1),
				blob: await buildPackZip(entries),
				stickerCount: pack.length
			});
			done++;
			progress();
		}
		return { archives, stickerCount: stickers.length, packCount: packs.length, overBudgetCount };
	} catch (cause) {
		if (cause instanceof ExportError) throw cause;
		throw new ExportError('EncodeFailed', { cause });
	}
}
