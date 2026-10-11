import { MAX_STICKERS_PER_PACK, MIN_STICKERS_PER_PACK } from './constants';

export function splitIntoPacks<T>(items: T[]): T[][] {
	if (items.length < MIN_STICKERS_PER_PACK) return [];
	const count = Math.ceil(items.length / MAX_STICKERS_PER_PACK);
	const base = Math.floor(items.length / count);
	const extra = items.length % count;
	let offset = 0;
	return Array.from({ length: count }, (_, index) => {
		const size = base + (index < extra ? 1 : 0);
		const pack = items.slice(offset, offset + size);
		offset += size;
		return pack;
	});
}
