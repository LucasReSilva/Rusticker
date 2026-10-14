export interface IdentifiedSticker {
	id: string;
}

/** Keep surviving IDs in their previous order and append new stickers in source order. */
export function reconcileStickerOrder(
	order: readonly string[],
	stickers: readonly IdentifiedSticker[]
): string[] {
	const available = new Set(stickers.map((sticker) => sticker.id));
	const seen = new Set<string>();
	const result: string[] = [];

	for (const id of order) {
		if (available.has(id) && !seen.has(id)) {
			seen.add(id);
			result.push(id);
		}
	}

	for (const sticker of stickers) {
		if (!seen.has(sticker.id)) {
			seen.add(sticker.id);
			result.push(sticker.id);
		}
	}

	return result;
}

/** Apply an ID order while keeping unlisted items in their source order. */
export function applyStickerOrder<T extends IdentifiedSticker>(
	stickers: readonly T[],
	order: readonly string[]
): T[] {
	const byId = new Map(stickers.map((sticker) => [sticker.id, sticker]));
	const result: T[] = [];

	for (const id of order) {
		const sticker = byId.get(id);
		if (sticker) {
			result.push(sticker);
			byId.delete(id);
		}
	}

	for (const sticker of stickers) {
		if (byId.has(sticker.id)) {
			result.push(sticker);
			byId.delete(sticker.id);
		}
	}

	return result;
}

/** Move an item to its final zero-based position without mutating the input. */
export function moveSticker<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
	if (
		!Number.isInteger(fromIndex) ||
		!Number.isInteger(toIndex) ||
		fromIndex < 0 ||
		fromIndex >= items.length ||
		toIndex < 0 ||
		toIndex >= items.length ||
		fromIndex === toIndex
	) {
		return [...items];
	}

	const result = [...items];
	const [item] = result.splice(fromIndex, 1);
	result.splice(toIndex, 0, item);
	return result;
}

/** Move a sticker to a final position by stable ID. Unknown IDs leave order unchanged. */
export function moveStickerById<T extends IdentifiedSticker>(
	stickers: readonly T[],
	id: string,
	toIndex: number
): T[] {
	const fromIndex = stickers.findIndex((sticker) => sticker.id === id);
	return moveSticker(stickers, fromIndex, toIndex);
}
