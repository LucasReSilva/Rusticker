import { SvelteMap } from 'svelte/reactivity';
import type { Sticker } from '$lib/detection/types';
import { encodeWithinBudget } from './quality';
import {
	ExportError,
	type EncodedSticker,
	type Encoder,
	type StickerSizeInfo,
	type StickerSizes
} from './types';

interface Entry {
	pixels: ImageData;
	promise: Promise<EncodedSticker>;
}

export function createStickerSizes(encoder: Encoder): StickerSizes {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Job identity is internal; only published sizes are reactive.
	const cache = new Map<string, Entry>();
	const states = new SvelteMap<string, StickerSizeInfo>();
	let queue: Promise<unknown> = Promise.resolve();
	let current: Map<string, ImageData> | undefined;

	function ensure(sticker: Sticker, retry = false): Entry {
		const previous = cache.get(sticker.id);
		if (
			previous?.pixels === sticker.pixels &&
			!(retry && states.get(sticker.id)?.status === 'error')
		) {
			return previous;
		}
		states.set(sticker.id, { status: 'pending' });
		const entry: Entry = {
			pixels: sticker.pixels,
			promise: queue.then(async () => {
				// Removed or superseded queued jobs never touch the encoder.
				if (cache.get(sticker.id) !== entry) throw new ExportError('EncodeFailed');
				try {
					const result = await encodeWithinBudget(sticker.pixels, encoder);
					if (cache.get(sticker.id) === entry) {
						states.set(sticker.id, {
							status: 'ready',
							bytes: result.bytes,
							overLimit: result.overLimit
						});
					}
					return result;
				} catch (error) {
					if (cache.get(sticker.id) === entry) states.set(sticker.id, { status: 'error' });
					throw error;
				}
			})
		};
		cache.set(sticker.id, entry);
		// Background jobs must never create unhandled rejections or stop the queue.
		queue = entry.promise.catch(() => {});
		return entry;
	}

	return {
		sync: (stickers) => {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Current membership guards jobs without subscribing callers to the cache.
			current = new Map(stickers.map((sticker) => [sticker.id, sticker.pixels]));
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- This temporary set is used only within sync.
			const ids = new Set(stickers.map((sticker) => sticker.id));
			for (const id of cache.keys()) {
				if (!ids.has(id)) {
					cache.delete(id);
					states.delete(id);
				}
			}
			for (const sticker of stickers) ensure(sticker);
		},
		get: (id) => states.get(id) ?? { status: 'pending' },
		encoded: (sticker) => {
			// Standalone exports work before sync; after sync only its current set is valid.
			if (current && current.get(sticker.id) !== sticker.pixels) {
				return Promise.reject(new ExportError('EncodeFailed'));
			}
			return ensure(sticker, true).promise;
		}
	};
}
