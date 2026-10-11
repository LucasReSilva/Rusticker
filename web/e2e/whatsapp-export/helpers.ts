import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

/** Paint and upload a sheet through the real tool input; no product test hooks. */
export async function uploadSheet(page: Page, count: number): Promise<void> {
	const base64 = await page.evaluate((count) => {
		const columns = Math.min(6, count);
		const rows = Math.ceil(count / columns);
		const canvas = document.createElement('canvas');
		canvas.width = columns * 160;
		canvas.height = rows * 160;
		const context = canvas.getContext('2d')!;
		context.fillStyle = 'rgb(0, 255, 0)';
		context.fillRect(0, 0, canvas.width, canvas.height);
		for (let i = 0; i < count; i++) {
			context.fillStyle = `rgb(${100 + i * 3}, ${20 + i * 2}, ${80 + i * 4})`;
			context.fillRect((i % columns) * 160 + 32, Math.floor(i / columns) * 160 + 32, 96, 96);
		}
		return canvas.toDataURL('image/png').split(',')[1];
	}, count);
	await page.locator('[data-tool-dropzone] input[type=file]').setInputFiles({
		name: 'synthetic-stickers.png',
		mimeType: 'image/png',
		buffer: Buffer.from(base64, 'base64')
	});
	await expect(page.locator('[data-sticker-card]')).toHaveCount(count);
	await expect(page.locator('[data-detected-count]')).toContainText(String(count));
}

export async function readArchive(download: Download): Promise<{ bytes: Buffer; zip: JSZip }> {
	const path = await download.path();
	expect(path).not.toBeNull();
	const bytes = await readFile(path!);
	return { bytes, zip: await JSZip.loadAsync(bytes) };
}

export function assertEntries(zip: JSZip, count: number): void {
	const expected = ['tray_icon.png'];
	for (let i = 1; i <= count; i++) {
		const n = String(i).padStart(2, '0');
		expected.push(`sticker_${n}.webp`, `png/sticker_${n}.png`);
	}
	expect(Object.keys(zip.files).sort()).toEqual(expected.sort());
}

/** Decode actual encoded images in Chromium, including representative alpha samples. */
export async function inspectImages(page: Page, zip: JSZip) {
	const images = await Promise.all(
		Object.keys(zip.files).map(async (name) => ({
			name,
			base64: await zip.file(name)!.async('base64')
		}))
	);
	return page.evaluate(async (images) => {
		const results = [];
		for (const { name, base64 } of images) {
			const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
			const bitmap = await createImageBitmap(
				new Blob([bytes], { type: name.endsWith('.webp') ? 'image/webp' : 'image/png' })
			);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const context = canvas.getContext('2d')!;
			context.drawImage(bitmap, 0, 0);
			results.push({
				name,
				bytes: bytes.length,
				width: bitmap.width,
				height: bitmap.height,
				cornerAlpha: context.getImageData(0, 0, 1, 1).data[3],
				center: Array.from(
					context.getImageData(Math.floor(bitmap.width / 2), Math.floor(bitmap.height / 2), 1, 1)
						.data
				)
			});
			bitmap.close();
		}
		return results;
	}, images);
}

export function stickerCenters(page: Page): Promise<number[][]> {
	return page.locator('[data-sticker-card] canvas').evaluateAll((canvases) =>
		canvases.map((element) => {
			const canvas = element as HTMLCanvasElement;
			return Array.from(canvas.getContext('2d')!.getImageData(256, 256, 1, 1).data);
		})
	);
}
