import { expect, it } from 'vitest';
import { nextIndex } from './grid-nav';

it('clamps edges and partial last rows, including single-column layouts', () => {
	expect(nextIndex(0, 'ArrowLeft', 7, 4)).toBe(0);
	expect(nextIndex(6, 'ArrowRight', 7, 4)).toBe(6);
	expect(nextIndex(3, 'ArrowDown', 7, 4)).toBe(6);
	expect(nextIndex(1, 'ArrowUp', 7, 4)).toBe(0);
	expect(nextIndex(3, 'ArrowDown', 7, 1)).toBe(4);
	expect(nextIndex(4, 'Home', 7, 4)).toBe(0);
	expect(nextIndex(4, 'End', 7, 4)).toBe(6);
	expect(nextIndex(0, 'ArrowRight', 0, 1)).toBe(-1);
});
it('swaps horizontal navigation for RTL', () => {
	expect(nextIndex(3, 'ArrowLeft', 7, 4, true)).toBe(4);
	expect(nextIndex(3, 'ArrowRight', 7, 4, true)).toBe(2);
});
