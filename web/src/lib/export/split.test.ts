import { expect, it } from 'vitest';
import { splitIntoPacks } from './split';

it.each([
	[0, []],
	[1, []],
	[2, []],
	[3, [3]],
	[30, [30]],
	[31, [16, 15]],
	[45, [23, 22]],
	[60, [30, 30]],
	[61, [21, 20, 20]],
	[90, [30, 30, 30]],
	[91, [23, 23, 23, 22]]
] as [number, number[]][])('balances %i stickers into %j', (count, expected) => {
	const items = Array.from({ length: count }, (_, i) => i);
	const packs = splitIntoPacks(items);
	expect(packs.map((pack) => pack.length)).toEqual(expected);
	if (count >= 3) expect(packs.flat()).toEqual(items);
});

it('preserves order and all pack invariants for 3..300 stickers', () => {
	for (let count = 3; count <= 300; count++) {
		const items = Array.from({ length: count }, (_, i) => i);
		const packs = splitIntoPacks(items);
		const sizes = packs.map((pack) => pack.length);
		expect(sizes.every((size) => size >= 3 && size <= 30)).toBe(true);
		expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
		expect(packs).toHaveLength(Math.ceil(count / 30));
		expect(packs.flat()).toEqual(items);
	}
});
