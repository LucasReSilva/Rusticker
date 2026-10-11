import { expect, test, type Download } from '@playwright/test';
import { assertEntries, inspectImages, readArchive, stickerCenters, uploadSheet } from './helpers';
import { savedLocale } from '../web-scaffold/fixtures';

test.use({ locale: 'pt-BR', storageState: savedLocale('pt-BR') });

test('downloads a complete transparent 17-sticker pack offline without requests', async ({
	page,
	context
}) => {
	await page.goto('en/');
	await uploadSheet(page, 17);
	const centers = await stickerCenters(page);
	await page.locator('[data-sticker-card]').nth(3).locator('button[aria-pressed]').click();
	await expect(
		page.locator('[data-sticker-card]').nth(3).locator('button[aria-pressed]')
	).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('[data-size-badge]').first()).toContainText('kB');
	await page.waitForLoadState('networkidle');
	await context.setOffline(true);
	const requests: string[] = [];
	context.on('request', (request) => {
		if (/^https?:/.test(request.url())) requests.push(request.url());
	});
	const pending = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download pack (.zip)', exact: true }).click();
	const download = await pending;
	expect(download.suggestedFilename()).toBe('rusticker-pack-1.zip');
	const { zip } = await readArchive(download);
	assertEntries(zip, 17);
	const images = await inspectImages(page, zip);
	for (const image of images) {
		const size = image.name === 'tray_icon.png' ? 96 : 512;
		expect([image.width, image.height]).toEqual([size, size]);
		expect(image.cornerAlpha).toBe(0);
		expect(image.center[3]).toBe(255);
		if (image.name.endsWith('.webp')) expect(image.bytes).toBeLessThanOrEqual(100_000);
		if (image.name.startsWith('png/')) {
			const position = Number(image.name.match(/sticker_(\d+)/)![1]) - 1;
			expect(image.center).toEqual(centers[position]);
		}
	}
	expect(images.find((image) => image.name === 'tray_icon.png')!.center).toEqual(centers[3]);
	await expect(page.getByText('Pack ready: 17 stickers', { exact: true })).toBeVisible();
	expect(requests).toEqual([]);
});

test('downloads balanced 16+15 packs in order and offers an identical per-pack re-download', async ({
	page
}) => {
	await page.goto('en/');
	await uploadSheet(page, 31);
	const centers = await stickerCenters(page);
	await expect(
		page.getByText('31 stickers will be split into 2 packs (up to 30 each).')
	).toBeVisible();
	const downloads: Download[] = [];
	page.on('download', (download) => downloads.push(download));
	await page.getByRole('button', { name: 'Download all 2 packs (.zip)', exact: true }).click();
	await expect.poll(() => downloads.length).toBe(2);
	expect(downloads.map((download) => download.suggestedFilename())).toEqual([
		'rusticker-pack-1.zip',
		'rusticker-pack-2.zip'
	]);
	const [first, second] = await Promise.all(downloads.map(readArchive));
	assertEntries(first.zip, 16);
	assertEntries(second.zip, 15);
	const secondImages = await inspectImages(page, second.zip);
	expect(secondImages.find((image) => image.name === 'png/sticker_01.png')!.center).toEqual(
		centers[16]
	);
	expect(await first.zip.file('tray_icon.png')!.async('uint8array')).toEqual(
		await second.zip.file('tray_icon.png')!.async('uint8array')
	);
	const pending = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download pack 2 of 2', exact: true }).click();
	const repeated = await readArchive(await pending);
	expect(repeated.bytes.equals(second.bytes)).toBe(true);
	await page.evaluate(() => {
		const state = window as unknown as { exportEncodeCalls: number };
		state.exportEncodeCalls = 0;
		const original = OffscreenCanvas.prototype.convertToBlob;
		OffscreenCanvas.prototype.convertToBlob = function (options) {
			state.exportEncodeCalls++;
			return original.call(this, options);
		};
	});
	await page.getByTestId('language-switcher').click();
	await page.getByRole('menuitemradio', { name: 'Español', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('lang', 'es');
	await expect(page.locator('[data-sticker-card]')).toHaveCount(31);
	const localizedDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Descargar paquete 2 de 2', exact: true }).click();
	const localized = await readArchive(await localizedDownload);
	expect(localized.bytes.equals(second.bytes)).toBe(true);
	expect(
		await page.evaluate(
			() => (window as unknown as { exportEncodeCalls: number }).exportEncodeCalls
		)
	).toBe(0);
});

test('reports silent WEBP fallback without downloading and permits a successful retry', async ({
	page
}) => {
	await page.addInitScript(() => {
		const original = OffscreenCanvas.prototype.convertToBlob;
		const state = window as unknown as { restoreWebp: () => void };
		state.restoreWebp = () => {
			OffscreenCanvas.prototype.convertToBlob = original;
		};
		OffscreenCanvas.prototype.convertToBlob = function (options) {
			return original.call(this, options?.type === 'image/webp' ? { type: 'image/png' } : options);
		};
	});
	await page.goto('en/');
	await uploadSheet(page, 3);
	await expect(page.locator('[data-size-badge]').first()).toHaveText('Size unavailable');
	const downloads: Download[] = [];
	page.on('download', (download) => downloads.push(download));
	const action = page.getByRole('button', { name: 'Download pack (.zip)', exact: true });
	await action.click();
	await expect(
		page.getByText("This browser can't create WEBP stickers. Try Chrome, Edge, or Firefox.", {
			exact: true
		})
	).toBeVisible();
	expect(downloads).toEqual([]);
	await expect(action).toBeEnabled();
	await page.evaluate(() => (window as unknown as { restoreWebp: () => void }).restoreWebp());
	const pending = page.waitForEvent('download');
	await action.click();
	expect((await pending).suggestedFilename()).toBe('rusticker-pack-1.zip');
	await expect(page.getByText('Pack ready: 3 stickers', { exact: true })).toBeVisible();
});

for (const [locale, path, button, notice, success] of [
	[
		'pt-BR',
		'./',
		'Baixar pacote (.zip)',
		'O WhatsApp precisa de pelo menos 3 figurinhas por pacote.',
		'Pacote pronto: 3 figurinhas'
	],
	[
		'en',
		'en/',
		'Download pack (.zip)',
		'WhatsApp needs at least 3 stickers per pack.',
		'Pack ready: 3 stickers'
	],
	[
		'es',
		'es/',
		'Descargar paquete (.zip)',
		'WhatsApp necesita al menos 3 stickers por paquete.',
		'Paquete listo: 3 stickers'
	]
] as const) {
	test(`shows the minimum notice, disables two stickers and exports with ${locale} text`, async ({
		page
	}) => {
		await page.goto(path);
		await uploadSheet(page, 2);
		await expect(page.getByRole('button', { name: button, exact: true })).toBeDisabled();
		await expect(page.getByText(notice, { exact: true })).toBeVisible();
		await uploadSheet(page, 3);
		const pending = page.waitForEvent('download');
		await page.getByRole('button', { name: button, exact: true }).click();
		expect((await pending).suggestedFilename()).toBe('rusticker-pack-1.zip');
		await expect(page.getByText(success, { exact: true })).toBeVisible();
	});
}
