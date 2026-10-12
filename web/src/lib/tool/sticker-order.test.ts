import { describe, expect, it } from 'vitest';
import {
	applyStickerOrder,
	moveSticker,
	moveStickerById,
	reconcileStickerOrder
} from './sticker-order';

const stickers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('reconcileStickerOrder', () => {
	it('preserves surviving order and appends newly available stickers in source order', () => {
		expect(
			reconcileStickerOrder(['c', 'a', 'removed'], [stickers[0], stickers[2], { id: 'd' }])
		).toEqual(['c', 'a', 'd']);
	});

	it('removes duplicate and unavailable IDs from both inputs', () => {
		expect(
			reconcileStickerOrder(['b', 'b', 'unknown'], [stickers[1], stickers[1], stickers[0]])
		).toEqual(['b', 'a']);
	});
});

describe('applyStickerOrder', () => {
	it('applies a partial ID order and appends unlisted objects in source order', () => {
		const source = [
			{ id: 'a', value: 1 },
			{ id: 'b', value: 2 },
			{ id: 'c', value: 3 }
		];
		expect(applyStickerOrder(source, ['c', 'a'])).toEqual([source[2], source[0], source[1]]);
	});

	it('ignores duplicate and unknown IDs in the requested order', () => {
		expect(applyStickerOrder(stickers, ['b', 'b', 'unknown'])).toEqual([
			stickers[1],
			stickers[0],
			stickers[2]
		]);
	});
});

describe('moveSticker', () => {
	it('moves an item to its final index without mutating the input', () => {
		const input = ['a', 'b', 'c', 'd'];
		expect(moveSticker(input, 1, 3)).toEqual(['a', 'c', 'd', 'b']);
		expect(input).toEqual(['a', 'b', 'c', 'd']);
	});

	it('supports moving in either direction and moving to the same position', () => {
		expect(moveSticker(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
		expect(moveSticker(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
	});

	it('leaves order unchanged for invalid or out-of-bounds indexes', () => {
		const input = ['a', 'b', 'c'];
		expect(moveSticker(input, -1, 0)).toEqual(input);
		expect(moveSticker(input, 0, 3)).toEqual(input);
		expect(moveSticker(input, 0.5, 1)).toEqual(input);
	});
});

it('moves a sticker by ID and leaves order unchanged for an unknown ID', () => {
	expect(moveStickerById(stickers, 'c', 0)).toEqual([stickers[2], stickers[0], stickers[1]]);
	expect(moveStickerById(stickers, 'unknown', 0)).toEqual(stickers);
});
