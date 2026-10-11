import JSZip from 'jszip';
import { expect, it } from 'vitest';
import { buildPackZip } from './zip';

it('stores exactly the entries, unchanged, with deterministic archive bytes', async () => {
	const entries = [
		{ name: 'sticker_01.webp', blob: new Blob(['webp-1']) },
		{ name: 'sticker_02.webp', blob: new Blob(['webp-2']) },
		{ name: 'png/sticker_01.png', blob: new Blob(['png-1']) },
		{ name: 'png/sticker_02.png', blob: new Blob(['png-2']) },
		{ name: 'tray_icon.png', blob: new Blob(['tray']) }
	];
	const first = await buildPackZip(entries);
	const second = await buildPackZip(entries);
	expect(new Uint8Array(await first.arrayBuffer())).toEqual(
		new Uint8Array(await second.arrayBuffer())
	);
	const zip = await JSZip.loadAsync(await first.arrayBuffer());
	expect(Object.keys(zip.files)).toEqual(entries.map((entry) => entry.name));
	for (const entry of entries) {
		expect(await zip.file(entry.name)!.async('uint8array')).toEqual(
			new Uint8Array(await entry.blob.arrayBuffer())
		);
		expect(zip.files[entry.name].dir).toBe(false);
	}
	// ZIP local-file compression method 0 is STORE.
	expect(new DataView(await first.arrayBuffer()).getUint16(8, true)).toBe(0);
});
