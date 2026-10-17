import { expect, test } from '@playwright/test';

test.use({ locale: 'pt-BR' });

async function tinyPng(page: import('@playwright/test').Page): Promise<Buffer> {
	const dataUrl = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 4;
		canvas.height = 3;
		const context = canvas.getContext('2d')!;
		context.fillStyle = 'rgb(240 100 30)';
		context.fillRect(0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/png');
	});
	return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function mediumPng(page: import('@playwright/test').Page): Promise<Buffer> {
	const dataUrl = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 2000;
		canvas.height = 2000;
		const context = canvas.getContext('2d')!;
		const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, 'rgb(240 100 30)');
		gradient.addColorStop(1, 'rgb(20 120 80)');
		context.fillStyle = gradient;
		context.fillRect(0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/png');
	});
	return Buffer.from(dataUrl.split(',')[1], 'base64');
}

test('upscales one local image and downloads a PNG under the deployment base path', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	const outboundRequestsWithBody: string[] = [];
	page.on('request', (request) => {
		if (request.postDataBuffer()?.byteLength) outboundRequestsWithBody.push(request.url());
	});
	await page.goto('ampliar/');
	await expect(page.getByRole('heading', { level: 1, name: 'Aumentar imagem' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Aumentar imagem' })).toHaveAttribute(
		'href',
		/\/Rusticker\/ampliar\/$/
	);

	await page.getByLabel('Escolher uma imagem').setInputFiles({
		name: 'tiny.png',
		mimeType: 'image/png',
		buffer: await tinyPng(page)
	});
	await expect(page.getByRole('img', { name: 'Imagem original selecionada' })).toBeVisible();
	await expect(page.getByText('4 × 3 pixels')).toBeVisible();
	await page.getByRole('button', { name: 'Ampliar imagem' }).click();
	await expect(page.getByRole('img', { name: 'Imagem ampliada localmente' })).toBeVisible();
	await expect(page.getByText('8 × 6 pixels')).toBeVisible();

	const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
	const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	expect(pageWidth).toBeLessThanOrEqual(viewportWidth);

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('link', { name: 'Baixar PNG' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('rusticker-upscaled.png');
	expect(outboundRequestsWithBody).toEqual([]);
});

test('rejects image dimensions outside the supported bounds before preview decode', async ({
	page
}) => {
	await page.goto('en/upscaler');
	const bytes = new Uint8Array(45);
	bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
	const view = new DataView(bytes.buffer);
	view.setUint32(8, 13);
	bytes.set(new TextEncoder().encode('IHDR'), 12);
	view.setUint32(16, 8193);
	view.setUint32(20, 1);
	bytes.set(new TextEncoder().encode('IDAT'), 37);
	await page.getByLabel('Choose an image').setInputFiles({
		name: 'too-wide.png',
		mimeType: 'image/png',
		buffer: Buffer.from(bytes)
	});
	await expect(page.getByRole('alert')).toHaveText(/exceeds the supported dimensions/);
	await expect(page.getByRole('img')).toHaveCount(0);
});

test('cancels an upscale and lets the user retry', async ({ page }) => {
	await page.goto('ampliar/');
	await page.getByLabel('Escolher uma imagem').setInputFiles({
		name: 'medium.png',
		mimeType: 'image/png',
		buffer: await mediumPng(page)
	});
	await expect(page.getByRole('img', { name: 'Imagem original selecionada' })).toBeVisible();
	await page.getByRole('button', { name: 'Ampliar imagem' }).click();
	await page.getByRole('button', { name: 'Cancelar' }).click();
	await expect(page.getByRole('button', { name: 'Ampliar imagem' })).toBeEnabled();
	await expect(page.getByRole('img', { name: 'Imagem ampliada localmente' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Ampliar imagem' }).click();
	await expect(page.getByRole('img', { name: 'Imagem ampliada localmente' })).toBeVisible();
});
