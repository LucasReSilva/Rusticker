export type PdfPaper = 'a4' | 'letter';
export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfSheetSettings {
	paper: PdfPaper;
	orientation: PdfOrientation;
	margin: number;
	spacing: number;
}

export interface PdfStickerInput {
	id: string;
	width: number;
	height: number;
}

export interface PdfStickerPlacement {
	stickerId: string;
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
	sourceWidth: number;
	sourceHeight: number;
}

export interface PdfSheetPage {
	index: number;
	placements: PdfStickerPlacement[];
}

export interface PdfSheetLayout {
	settings: PdfSheetSettings;
	pageWidth: number;
	pageHeight: number;
	pages: PdfSheetPage[];
}

const PAPER_MM: Record<PdfPaper, [number, number]> = {
	a4: [210, 297],
	letter: [215.9, 279.4]
};

export function pageDimensions(settings: Pick<PdfSheetSettings, 'paper' | 'orientation'>) {
	const [short, long] = PAPER_MM[settings.paper];
	return settings.orientation === 'portrait'
		? { width: short, height: long }
		: { width: long, height: short };
}

export function layoutPdfSheets(
	stickers: readonly PdfStickerInput[],
	settings: PdfSheetSettings,
	maxStickerSize = 50
): PdfSheetLayout {
	if (!Number.isFinite(settings.margin) || settings.margin < 0)
		throw new RangeError('Invalid margin');
	if (!Number.isFinite(settings.spacing) || settings.spacing < 0)
		throw new RangeError('Invalid spacing');
	const { width: pageWidth, height: pageHeight } = pageDimensions(settings);
	const printableWidth = pageWidth - settings.margin * 2;
	const printableHeight = pageHeight - settings.margin * 2;
	if (printableWidth <= 0 || printableHeight <= 0) throw new RangeError('Margins exceed page size');
	if (!Number.isFinite(maxStickerSize) || maxStickerSize <= 0)
		throw new RangeError('Invalid maximum sticker size');

	const pages: PdfSheetPage[] = [];
	let page = 0;
	let x = settings.margin;
	let y = settings.margin;
	let rowHeight = 0;
	const ensurePage = () => {
		pages[page] ??= { index: page, placements: [] };
	};

	for (const sticker of stickers) {
		if (
			!sticker.id ||
			!Number.isFinite(sticker.width) ||
			!Number.isFinite(sticker.height) ||
			sticker.width <= 0 ||
			sticker.height <= 0
		)
			throw new RangeError('Invalid sticker dimensions');
		const scale =
			Math.min(maxStickerSize, printableWidth, printableHeight) /
			Math.max(sticker.width, sticker.height);
		const stickerWidth = sticker.width * scale;
		const stickerHeight = sticker.height * scale;
		if (x + stickerWidth > pageWidth - settings.margin + 1e-8) {
			x = settings.margin;
			y += rowHeight + settings.spacing;
			rowHeight = 0;
		}
		if (y + stickerHeight > pageHeight - settings.margin + 1e-8) {
			page++;
			x = settings.margin;
			y = settings.margin;
			rowHeight = 0;
		}
		ensurePage();
		pages[page].placements.push({
			stickerId: sticker.id,
			page,
			x,
			y,
			width: stickerWidth,
			height: stickerHeight,
			sourceWidth: sticker.width,
			sourceHeight: sticker.height
		});
		x += stickerWidth + settings.spacing;
		rowHeight = Math.max(rowHeight, stickerHeight);
	}
	return { settings: { ...settings }, pageWidth, pageHeight, pages };
}

export function movePdfSticker(
	layout: PdfSheetLayout,
	stickerId: string,
	deltaX: number,
	deltaY: number
): PdfSheetLayout {
	if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return layout;
	return updatePlacement(layout, stickerId, (placement, peers) => {
		const x = clamp(
			placement.x + deltaX,
			layout.settings.margin,
			layout.pageWidth - layout.settings.margin - placement.width
		);
		const y = clamp(
			placement.y + deltaY,
			layout.settings.margin,
			layout.pageHeight - layout.settings.margin - placement.height
		);
		return intersectsAny({ ...placement, x, y }, peers, layout.settings.spacing)
			? placement
			: { ...placement, x, y };
	});
}

export function resizePdfSticker(
	layout: PdfSheetLayout,
	stickerId: string,
	factor: number
): PdfSheetLayout {
	if (!Number.isFinite(factor) || factor <= 0) return layout;
	return updatePlacement(layout, stickerId, (placement, peers) => {
		const ratio = placement.sourceWidth / placement.sourceHeight;
		const maxWidth = layout.pageWidth - layout.settings.margin - placement.x;
		const maxHeight = layout.pageHeight - layout.settings.margin - placement.y;
		const maxHeightByWidth = maxWidth / ratio;
		const maxHeightAllowed = Math.min(maxHeight, maxHeightByWidth);
		if (maxHeightAllowed < 1) return placement;
		const desiredHeight = Math.min(placement.height * factor, maxHeightAllowed);
		const height = Math.max(1, desiredHeight);
		const resized = { ...placement, width: height * ratio, height };
		return intersectsAny(resized, peers, layout.settings.spacing) ? placement : resized;
	});
}

function updatePlacement(
	layout: PdfSheetLayout,
	stickerId: string,
	update: (placement: PdfStickerPlacement, peers: PdfStickerPlacement[]) => PdfStickerPlacement
): PdfSheetLayout {
	let found = false;
	const pages = layout.pages.map((page) => {
		const placements = page.placements.map((placement) => {
			if (placement.stickerId !== stickerId) return placement;
			found = true;
			return update(
				placement,
				page.placements.filter((peer) => peer.stickerId !== stickerId)
			);
		});
		return { ...page, placements };
	});
	return found ? { ...layout, pages } : layout;
}

function intersectsAny(
	placement: PdfStickerPlacement,
	peers: readonly PdfStickerPlacement[],
	gap: number
) {
	return peers.some(
		(peer) =>
			placement.x < peer.x + peer.width + gap - 1e-8 &&
			placement.x + placement.width + gap - 1e-8 > peer.x &&
			placement.y < peer.y + peer.height + gap - 1e-8 &&
			placement.y + placement.height + gap - 1e-8 > peer.y
	);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
