import { describe, expect, it } from 'vitest';
import { inspectImageFile, scaledDimensions } from './image';

function png(width: number, height: number, animation = false) {
	const bytes = new Uint8Array(45);
	bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
	const view = new DataView(bytes.buffer);
	view.setUint32(8, 13);
	bytes.set(new TextEncoder().encode('IHDR'), 12);
	view.setUint32(16, width);
	view.setUint32(20, height);
	bytes.set(new TextEncoder().encode(animation ? 'acTL' : 'IDAT'), 37);
	return new File([bytes], 'image.png', { type: 'image/png' });
}

function jpeg(width: number, height: number) {
	const bytes = new Uint8Array(13);
	bytes.set([
		0xff,
		0xd8,
		0xff,
		0xc0,
		0,
		11,
		8,
		height >> 8,
		height & 0xff,
		width >> 8,
		width & 0xff
	]);
	return new File([bytes], 'image.jpg', { type: 'image/jpeg' });
}

function webp(width: number, height: number, animated = false) {
	const bytes = new Uint8Array(30);
	bytes.set(new TextEncoder().encode('RIFF'), 0);
	bytes.set(new TextEncoder().encode('WEBPVP8X'), 8);
	new DataView(bytes.buffer).setUint32(16, 10, true);
	bytes[20] = animated ? 0x02 : 0;
	bytes[24] = (width - 1) & 0xff;
	bytes[25] = ((width - 1) >> 8) & 0xff;
	bytes[26] = ((width - 1) >> 16) & 0xff;
	bytes[27] = (height - 1) & 0xff;
	bytes[28] = ((height - 1) >> 8) & 0xff;
	bytes[29] = ((height - 1) >> 16) & 0xff;
	return new File([bytes], 'image.webp', { type: 'image/webp' });
}

describe('image metadata validation', () => {
	it('reads PNG dimensions without decoding pixels', async () => {
		await expect(inspectImageFile(png(320, 240))).resolves.toEqual({ width: 320, height: 240 });
	});

	it('reads JPEG and static WebP dimensions', async () => {
		await expect(inspectImageFile(jpeg(320, 240))).resolves.toEqual({ width: 320, height: 240 });
		await expect(inspectImageFile(webp(320, 240))).resolves.toEqual({ width: 320, height: 240 });
	});

	it('rejects unsupported and malformed input', async () => {
		await expect(inspectImageFile(new File(['not-an-image'], 'x.txt'))).rejects.toMatchObject({
			code: 'UnsupportedFormat'
		});
		await expect(inspectImageFile(png(0, 20))).rejects.toMatchObject({ code: 'MalformedImage' });
		await expect(inspectImageFile(png(20, 20, true))).rejects.toMatchObject({
			code: 'AnimatedImage'
		});
		await expect(inspectImageFile(webp(20, 20, true))).rejects.toMatchObject({
			code: 'AnimatedImage'
		});
	});

	it('fails closed when PNG metadata cannot be fully inspected', async () => {
		const bytes = new Uint8Array(1024 * 1024 + 45);
		bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
		const view = new DataView(bytes.buffer);
		view.setUint32(8, 13);
		bytes.set(new TextEncoder().encode('IHDR'), 12);
		view.setUint32(16, 100);
		view.setUint32(20, 100);
		view.setUint32(33, 1024 * 1024);
		bytes.set(new TextEncoder().encode('tEXt'), 37);
		await expect(inspectImageFile(new File([bytes], 'oversized-header.png'))).rejects.toMatchObject(
			{
				code: 'MalformedImage'
			}
		);
	});

	it('rejects excessive source and output dimensions', async () => {
		await expect(inspectImageFile(png(8193, 1))).rejects.toMatchObject({ code: 'ImageTooLarge' });
		expect(() => scaledDimensions({ width: 3000, height: 3000 }, 2)).toThrow('ImageTooLarge');
	});

	it('validates supported scale values and rounds output dimensions', () => {
		expect(scaledDimensions({ width: 31, height: 16 }, 1.5)).toEqual({ width: 47, height: 24 });
		expect(() => scaledDimensions({ width: 2, height: 2 }, 1.25)).toThrow('InvalidScale');
	});
});
