import { expect, it } from 'vitest';
import { moveCrosshair, sampleColor, toHex } from './eyedropper';

it('moves by image-relative steps, accelerates with Shift, and clamps all edges', () => {
	const size = { width: 600, height: 400 };
	expect(moveCrosshair({ x: 10, y: 10 }, 'ArrowRight', false, size)).toEqual({ x: 14, y: 10 });
	expect(moveCrosshair({ x: 10, y: 10 }, 'ArrowDown', true, size)).toEqual({ x: 10, y: 50 });
	expect(moveCrosshair({ x: 0, y: 0 }, 'ArrowLeft', true, size)).toEqual({ x: 0, y: 0 });
	expect(moveCrosshair({ x: 0, y: 0 }, 'ArrowUp', true, size)).toEqual({ x: 0, y: 0 });
	expect(moveCrosshair({ x: 599, y: 399 }, 'ArrowDown', false, size)).toEqual({ x: 599, y: 399 });
	expect(moveCrosshair({ x: 599, y: 399 }, 'ArrowRight', false, size)).toEqual({ x: 599, y: 399 });
	expect(moveCrosshair({ x: 0, y: 0 }, 'ArrowRight', false, { width: 2, height: 2 }).x).toBe(1);
});
it('averages neighborhoods clipped at corners and edges', () => {
	const data = new Uint8ClampedArray(3 * 3 * 4);
	for (let i = 0; i < 9; i++) data.set([i * 10, i * 20, 255, 255], i * 4);
	const image = { data, width: 3, height: 3 } as ImageData;
	expect(sampleColor(image, 1, 1)).toEqual({ r: 40, g: 80, b: 255 });
	expect(sampleColor(image, 0, 0)).toEqual({ r: 20, g: 40, b: 255 });
	expect(sampleColor(image, 2, 2)).toEqual({ r: 60, g: 120, b: 255 });
	expect(sampleColor(image, 0, 1)).toEqual({ r: 35, g: 70, b: 255 });
	expect(toHex({ r: 0, g: 177, b: 64 })).toBe('#00B140');
});
