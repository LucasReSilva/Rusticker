import { expect, test } from '@playwright/test';

test.use({ locale: 'en-US' });

test('keeps conventional resize as default and offers a local ONNX model input', async ({
	page
}) => {
	await page.goto('en/upscaler/');
	await expect(page.getByRole('radio', { name: 'Conventional resize' })).toBeChecked();
	await expect(page.getByLabel('Choose an ONNX model')).toBeAttached();
	await expect(page.getByText(/using CPU\/WASM/)).toHaveCount(0);
	await page.getByRole('radio', { name: 'Experimental ONNX model' }).check();
	await expect(page.getByText(/using CPU\/WASM/)).toBeVisible();
	await expect(page.getByText('Choose an ONNX model')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Upscale image' })).toHaveCount(0);
});
