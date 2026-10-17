import type { Sticker } from '$lib/detection/types';
import type { PdfSheetLayout, PdfStickerPlacement } from './pdf-layout';

const POINTS_PER_MM = 72 / 25.4;

interface PdfObject {
	bytes: Uint8Array;
}

export interface PdfExportResult {
	blob: Blob;
	fileName: string;
	pageCount: number;
}

export class PdfExportError extends Error {
	constructor(
		readonly code: 'EmptySelection' | 'InvalidLayout' | 'CompressionUnsupported' | 'EncodeFailed',
		options?: { cause?: unknown }
	) {
		super(code, options);
		this.name = 'PdfExportError';
	}
}

export async function exportPdfSheets(
	stickers: readonly Sticker[],
	layout: PdfSheetLayout
): Promise<PdfExportResult> {
	if (!stickers.length || !layout.pages.length) throw new PdfExportError('EmptySelection');
	if (typeof CompressionStream === 'undefined') throw new PdfExportError('CompressionUnsupported');
	try {
		const stickersById = new Map(stickers.map((sticker) => [sticker.id, sticker]));
		const allPlacements = layout.pages.flatMap(({ placements }) => placements);
		if (
			allPlacements.length !== stickers.length ||
			new Set(allPlacements.map(({ stickerId }) => stickerId)).size !== stickers.length ||
			stickers.some(({ id }) => !stickersById.has(id)) ||
			allPlacements.some((placement) => !stickersById.has(placement.stickerId))
		)
			throw new PdfExportError('InvalidLayout');

		const objects: PdfObject[] = [];
		const add = (value: string | Uint8Array) => {
			objects.push({ bytes: typeof value === 'string' ? encode(value) : value });
			return objects.length;
		};
		const reserve = () => {
			objects.push({ bytes: new Uint8Array() });
			return objects.length;
		};
		const set = (id: number, value: string | Uint8Array) => {
			objects[id - 1] = { bytes: typeof value === 'string' ? encode(value) : value };
		};
		const catalogId = reserve();
		const pagesId = reserve();
		const imageIds = new Map<string, { rgb: number; alpha: number }>();
		for (const sticker of stickers) {
			const { width, height, data } = sticker.pixels;
			const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
			const rgb = new Uint8Array(width * height * 3);
			const alpha = new Uint8Array(width * height);
			for (let src = 0, color = 0, mask = 0; src < rgba.length; src += 4) {
				rgb[color++] = rgba[src];
				rgb[color++] = rgba[src + 1];
				rgb[color++] = rgba[src + 2];
				alpha[mask++] = rgba[src + 3];
			}
			const compressedRgb = await deflate(rgb);
			const compressedAlpha = await deflate(alpha);
			const alphaId = reserve();
			const rgbId = reserve();
			set(
				alphaId,
				streamObject(
					`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,
					compressedAlpha
				)
			);
			set(
				rgbId,
				streamObject(
					`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${alphaId} 0 R`,
					compressedRgb
				)
			);
			imageIds.set(sticker.id, { rgb: rgbId, alpha: alphaId });
		}

		const pageIds: number[] = [];
		const pageWidthPt = layout.pageWidth * POINTS_PER_MM;
		const pageHeightPt = layout.pageHeight * POINTS_PER_MM;
		for (const page of layout.pages) {
			const resources: string[] = [];
			const drawing: string[] = [];
			page.placements.forEach((placement, index) => {
				const image = imageIds.get(placement.stickerId);
				if (!image) throw new PdfExportError('InvalidLayout');
				resources.push(`/Im${index} ${image.rgb} 0 R`);
				drawing.push(drawCommand(placement, layout.pageHeight, index));
			});
			const contentId = add(streamObject('', await deflate(encode(drawing.join('\n')))));
			const pageId = add(
				`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${decimal(pageWidthPt)} ${decimal(pageHeightPt)}] /Resources << /XObject << ${resources.join(' ')} >> >> /Contents ${contentId} 0 R >>`
			);
			pageIds.push(pageId);
		}
		set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
		set(
			pagesId,
			`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
		);
		return {
			blob: new Blob([serializePdf(objects)], { type: 'application/pdf' }),
			fileName: 'rusticker-sticker-sheets.pdf',
			pageCount: layout.pages.length
		};
	} catch (cause) {
		if (cause instanceof PdfExportError) throw cause;
		throw new PdfExportError('EncodeFailed', { cause });
	}
}

function drawCommand(placement: PdfStickerPlacement, pageHeight: number, imageIndex: number) {
	const x = placement.x * POINTS_PER_MM;
	const y = (pageHeight - placement.y - placement.height) * POINTS_PER_MM;
	const width = placement.width * POINTS_PER_MM;
	const height = placement.height * POINTS_PER_MM;
	return `q ${decimal(width)} 0 0 ${decimal(height)} ${decimal(x)} ${decimal(y)} cm /Im${imageIndex} Do Q`;
}

function streamObject(dictionary: string, stream: Uint8Array): Uint8Array {
	return concat(
		encode(`<< ${dictionary ? `${dictionary} ` : ''}/Length ${stream.byteLength} >>\nstream\n`),
		stream,
		encode('\nendstream')
	);
}

async function deflate(value: Uint8Array): Promise<Uint8Array> {
	const copy = value.slice();
	const stream = new Blob([copy.buffer as ArrayBuffer])
		.stream()
		.pipeThrough(new CompressionStream('deflate'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

function serializePdf(objects: PdfObject[]) {
	const chunks: Uint8Array[] = [encode('%PDF-1.4\n%âãÏÓ\n')];
	const offsets = [0];
	let offset = chunks[0].byteLength;
	for (const [index, object] of objects.entries()) {
		offsets.push(offset);
		const header = encode(`${index + 1} 0 obj\n`);
		const tail = encode('\nendobj\n');
		chunks.push(header, object.bytes, tail);
		offset += header.byteLength + object.bytes.byteLength + tail.byteLength;
	}
	const xrefOffset = offset;
	const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n'];
	for (const objectOffset of offsets.slice(1))
		xref.push(`${String(objectOffset).padStart(10, '0')} 00000 n \n`);
	const trailer =
		`${xref.join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
		`startxref\n${xrefOffset}\n%%EOF`;
	chunks.push(encode(trailer));
	return concat(...chunks);
}

function concat(...chunks: Uint8Array[]) {
	const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return output;
}

function encode(value: string) {
	return new TextEncoder().encode(value);
}

function decimal(value: number) {
	return Number(value.toFixed(4)).toString();
}
