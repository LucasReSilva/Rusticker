export interface DecodedImage {
	imageData: ImageData;
	width: number;
	height: number;
}

/** Decode locally with the image's EXIF orientation applied. */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
	let bitmap: ImageBitmap | undefined;
	try {
		bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
		const { width, height } = bitmap;
		const context = new OffscreenCanvas(width, height).getContext('2d', {
			willReadFrequently: true
		});
		if (!context) throw new Error('DecodeFailed');
		context.drawImage(bitmap, 0, 0);
		return { width, height, imageData: context.getImageData(0, 0, width, height) };
	} catch (cause) {
		throw new Error('DecodeFailed', { cause });
	} finally {
		bitmap?.close();
	}
}
