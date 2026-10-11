import JSZip from 'jszip';

export interface ZipEntry {
	name: string;
	blob: Blob;
}

/** No implicit directory entries, metadata files, or time-dependent data. */
export async function buildPackZip(entries: ZipEntry[]): Promise<Blob> {
	const zip = new JSZip();
	for (const { name, blob } of entries) {
		zip.file(name, await blob.arrayBuffer(), {
			compression: 'STORE',
			createFolders: false,
			date: new Date('1980-01-01T00:00:00Z')
		});
	}
	const bytes = await zip.generateAsync({ type: 'arraybuffer', compression: 'STORE' });
	return new Blob([bytes], { type: 'application/zip' });
}
