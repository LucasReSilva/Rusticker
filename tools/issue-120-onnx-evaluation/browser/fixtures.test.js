import { expect, test } from "bun:test";
import { resizeLanczos } from "./fixtures.js";

test("Lanczos-3 upsampling keeps a three-source-pixel support radius", () => {
	const source = new Float32Array(8 * 8);
	for (let y = 0; y < 8; y += 1) source[y * 8 + 1] = 1;

	const resized = resizeLanczos(source, 1, 8, 32);
	for (let y = 0; y < 32; y += 1) {
		expect(resized[y * 32 + 28]).toBe(0);
	}
	expect(resized[16 * 32 + 6]).toBeGreaterThan(0);
});

test("Lanczos-3 upsampling preserves a constant image", () => {
	const source = new Float32Array(8 * 8).fill(0.4);
	const resized = resizeLanczos(source, 1, 8, 32);
	for (const value of resized) expect(value).toBeCloseTo(0.4, 6);
});
