import { expect, it, vi } from 'vitest';
import { encodeWithinBudget } from './quality';
import { fakeEncoder } from './test-helpers';

const pixels = {} as ImageData;
it('encodes exactly once when the starting quality fits', async () => {
	const encoder = fakeEncoder();
	const spy = vi.spyOn(encoder, 'webp');
	expect(await encodeWithinBudget(pixels, encoder)).toMatchObject({
		bytes: 42,
		quality: 0.9,
		overLimit: false
	});
	expect(spy).toHaveBeenCalledExactlyOnceWith(pixels, 0.9);
});
it('finds a fitting quality within 0.025 in at most seven encodes', async () => {
	const encoder = fakeEncoder((quality) => Math.round(200_000 * quality));
	const spy = vi.spyOn(encoder, 'webp');
	const result = await encodeWithinBudget(pixels, encoder);
	expect(result.bytes).toBeLessThanOrEqual(100_000);
	expect(result.quality).toBeGreaterThanOrEqual(0.5 - 0.025);
	expect(result.quality).toBeLessThanOrEqual(0.5);
	expect(spy.mock.calls.length).toBeLessThanOrEqual(7);
});
it('returns the floor encoding flagged when even the floor is too large', async () => {
	const encoder = fakeEncoder(() => 100_001);
	const spy = vi.spyOn(encoder, 'webp');
	expect(await encodeWithinBudget(pixels, encoder)).toMatchObject({
		quality: 0.1,
		bytes: 100_001,
		overLimit: true
	});
	expect(spy).toHaveBeenCalledTimes(2);
});
it('accepts exactly 100,000 bytes', async () => {
	expect(
		await encodeWithinBudget(
			pixels,
			fakeEncoder(() => 100_000)
		)
	).toMatchObject({ bytes: 100_000, overLimit: false, quality: 0.9 });
});
it('only returns measured fitting blobs for non-monotonic sizes', async () => {
	const encoder = fakeEncoder((q) => (q === 0.9 || (q > 0.3 && q < 0.6) ? 120_000 : 80_000));
	const result = await encodeWithinBudget(pixels, encoder);
	expect(result.blob.size).toBeLessThanOrEqual(100_000);
	expect(result.overLimit).toBe(false);
});
it('detects silent PNG fallback', async () => {
	const encoder = fakeEncoder();
	encoder.webp = async () => new Blob([], { type: 'image/png' });
	await expect(encodeWithinBudget(pixels, encoder)).rejects.toMatchObject({
		code: 'WebpUnsupported'
	});
});
it('maps encoder rejection to EncodeFailed', async () => {
	const encoder = fakeEncoder();
	encoder.webp = async () => {
		throw new Error('test');
	};
	await expect(encodeWithinBudget(pixels, encoder)).rejects.toMatchObject({ code: 'EncodeFailed' });
});
