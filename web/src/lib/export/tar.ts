import type { ZipEntry } from './zip';

const BLOCK_SIZE = 512;

const arrayBufferPart = (value: Uint8Array): ArrayBuffer =>
	new Uint8Array(value).buffer as ArrayBuffer;

function writeText(header: Uint8Array, offset: number, length: number, value: string): void {
	const bytes = new TextEncoder().encode(value);
	if (bytes.length > length) throw new Error('TarFieldTooLong');
	header.set(bytes, offset);
}

function writeOctal(header: Uint8Array, offset: number, length: number, value: number): void {
	const encoded = value.toString(8).padStart(length - 1, '0');
	if (encoded.length >= length) throw new Error('TarNumberTooLarge');
	writeText(header, offset, length, `${encoded}\0`);
}

function tarHeader(name: string, size: number): Uint8Array {
	if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..')
		throw new Error('InvalidTarEntryName');
	const header = new Uint8Array(BLOCK_SIZE);
	writeText(header, 0, 100, name);
	writeOctal(header, 100, 8, 0o644);
	writeOctal(header, 108, 8, 0);
	writeOctal(header, 116, 8, 0);
	writeOctal(header, 124, 12, size);
	writeOctal(header, 136, 12, 0);
	header.fill(32, 148, 156);
	header[156] = '0'.charCodeAt(0);
	writeText(header, 257, 6, 'ustar\0');
	writeText(header, 263, 2, '00');
	let checksum = 0;
	for (const byte of header) checksum += byte;
	writeText(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
	return header;
}

export async function buildTarGz(entries: ZipEntry[]): Promise<Blob> {
	if (typeof CompressionStream === 'undefined') throw new Error('GzipUnsupported');
	const parts: BlobPart[] = [];
	for (const { name, blob } of entries) {
		const bytes = await blob.arrayBuffer();
		parts.push(arrayBufferPart(tarHeader(name, bytes.byteLength)), bytes);
		const padding = (BLOCK_SIZE - (bytes.byteLength % BLOCK_SIZE)) % BLOCK_SIZE;
		if (padding) parts.push(arrayBufferPart(new Uint8Array(padding)));
	}
	parts.push(arrayBufferPart(new Uint8Array(BLOCK_SIZE * 2)));
	const archive = new Blob(parts).stream().pipeThrough(new CompressionStream('gzip'));
	const compressed = await new Response(archive).blob();
	return new Blob([await compressed.arrayBuffer()], { type: 'application/gzip' });
}
