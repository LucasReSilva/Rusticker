import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { createExportController } from './controller.svelte';
import { createExportSession } from './session';
import { createStickerSizes } from './sizes.svelte';
import { deferred, fakeEncoder, mockStickers } from './test-helpers';
import type { Sticker } from '$lib/detection/types';

const cleanups: (() => void)[] = [];
beforeEach(() => vi.stubGlobal('Blob', NodeBlob));
afterEach(() => {
	cleanups.splice(0).forEach((cleanup) => cleanup());
	vi.unstubAllGlobals();
});

async function setup(count = 3, encoder = fakeEncoder()) {
	const stickers = await mockStickers(count);
	const source = new SvelteMap<string, Sticker[] | boolean | string | null>([
		['stickers', stickers],
		['detecting', false],
		['tray', null]
	]);
	const sizes = createStickerSizes(encoder);
	sizes.sync(stickers);
	const download = vi.fn();
	const pause = vi.fn(async () => {});
	const deps = {
		getStickers: () => source.get('stickers') as Sticker[],
		getTrayIconId: () => source.get('tray') as string | null,
		isDetecting: () => source.get('detecting') as boolean,
		sizes,
		encoder,
		download,
		pause,
		session: createExportSession()
	};
	let controller!: ReturnType<typeof createExportController>;
	cleanups.push(
		$effect.root(() => {
			controller = createExportController(deps);
		})
	);
	flushSync();
	return { stickers, source, sizes, controller, download, pause, deps };
}

it('retains ready ZIPs across a locale remount without re-encoding and invalidates changed input', async () => {
	const encoder = fakeEncoder();
	const webp = vi.spyOn(encoder, 'webp');
	const png = vi.spyOn(encoder, 'png');
	const { controller, deps, source, download, stickers } = await setup(31, encoder);
	await controller.exportAll();
	const ready = controller.archives;
	cleanups.pop()!();
	let remounted!: ReturnType<typeof createExportController>;
	cleanups.push(
		$effect.root(() => {
			remounted = createExportController(deps);
		})
	);
	flushSync();
	expect(remounted.phase).toBe('done');
	expect(remounted.archives).toBe(ready);
	await remounted.downloadPack(1);
	expect(download).toHaveBeenLastCalledWith(ready[1].blob, 'rusticker-pack-2.zip');
	await remounted.exportAll();
	expect(remounted.progress).toEqual({ done: 33, total: 33 });
	expect(webp).toHaveBeenCalledTimes(31);
	expect(png).toHaveBeenCalledTimes(31);
	source.set('tray', stickers[1].id);
	flushSync();
	expect(remounted.archives).toEqual([]);
	cleanups.pop()!();
	cleanups.push(
		$effect.root(() => {
			remounted = createExportController(deps);
		})
	);
	flushSync();
	expect(remounted.archives).toEqual([]);
});

it('keeps ready archives on teardown while cancelling remaining automatic downloads', async () => {
	const { controller, deps, pause, download } = await setup(31);
	const gap = deferred<void>();
	pause.mockImplementation(() => gap.promise);
	const pending = controller.exportAll();
	await vi.waitFor(() => expect(pause).toHaveBeenCalled());
	const ready = controller.archives;
	cleanups.pop()!();
	gap.resolve();
	await pending;
	expect(download).toHaveBeenCalledTimes(1);
	let remounted!: ReturnType<typeof createExportController>;
	cleanups.push(
		$effect.root(() => {
			remounted = createExportController(deps);
		})
	);
	flushSync();
	expect(remounted.archives).toBe(ready);
	await remounted.downloadPack(1);
	expect(download).toHaveBeenCalledTimes(2);
});

it('blocks fewer than three stickers and detection, and plans balanced packs', async () => {
	const { controller, source, download } = await setup(2);
	expect(controller.canExport).toBe(false);
	expect(controller.blockedReason).toBe('TooFewStickers');
	await controller.exportAll();
	expect(download).not.toHaveBeenCalled();
	source.set('stickers', await mockStickers(61));
	expect(controller.plan.packSizes).toEqual([21, 20, 20]);
	source.set('detecting', true);
	expect(controller.blockedReason).toBe('Detecting');
	expect(controller.canExport).toBe(false);
});

it('downloads each pack in order, blocks duplicate export, and re-downloads without re-encoding', async () => {
	const encoder = fakeEncoder();
	const spy = vi.spyOn(encoder, 'webp');
	const { controller, download, pause } = await setup(31, encoder);
	const pending = controller.exportAll();
	expect(controller.phase).toBe('exporting');
	expect(controller.canExport).toBe(false);
	expect(controller.blockedReason).toBe('Exporting');
	await controller.exportAll();
	await controller.downloadPack(0);
	await pending;
	expect(controller.phase).toBe('done');
	expect(download.mock.calls.map((call) => call[1])).toEqual([
		'rusticker-pack-1.zip',
		'rusticker-pack-2.zip'
	]);
	expect(pause).toHaveBeenCalledTimes(1);
	expect(spy).toHaveBeenCalledTimes(31);
	await controller.downloadPack(1);
	expect(download).toHaveBeenLastCalledWith(controller.archives[1].blob, 'rusticker-pack-2.zip');
	expect(spy).toHaveBeenCalledTimes(31);
});

it('sets error and permits a successful retry after encoder failure', async () => {
	const encoder = fakeEncoder();
	const spy = vi.spyOn(encoder, 'webp').mockRejectedValue(new Error('test'));
	const { controller, download } = await setup(3, encoder);
	await expect(controller.exportAll()).rejects.toMatchObject({ code: 'EncodeFailed' });
	expect(controller.phase).toBe('error');
	expect(controller.canExport).toBe(true);
	expect(download).not.toHaveBeenCalled();
	spy.mockImplementation(fakeEncoder().webp);
	await controller.exportAll();
	expect(controller.phase).toBe('done');
	expect(download).toHaveBeenCalledTimes(1);
});

it('clears archives after removal, pixel replacement, or tray change', async () => {
	const { stickers, controller, source, sizes } = await setup(3);
	await controller.exportAll();
	expect(controller.archives).toHaveLength(1);
	source.set('tray', stickers[1].id);
	flushSync();
	expect(controller.archives).toEqual([]);
	await controller.exportAll();
	expect(controller.archives).toHaveLength(1);
	const replacement = { ...stickers[0], pixels: stickers[1].pixels };
	const changed = [replacement, ...stickers.slice(1)];
	source.set('stickers', changed);
	sizes.sync(changed);
	flushSync();
	expect(controller.archives).toEqual([]);
	await controller.exportAll();
	source.set('stickers', stickers.slice(1));
	sizes.sync(stickers.slice(1));
	flushSync();
	expect(controller.archives).toEqual([]);
});

it.each(['stickers', 'tray', 'detecting'])(
	'prevents stale downloads when %s changes during encoding',
	async (field) => {
		const encoder = fakeEncoder();
		const blocked = deferred<Blob>();
		vi.spyOn(encoder, 'png').mockImplementationOnce(() => blocked.promise);
		const { controller, source, sizes, stickers, download } = await setup(3, encoder);
		const pending = controller.exportAll();
		await vi.waitFor(() => expect(encoder.png).toHaveBeenCalled());
		if (field === 'stickers') {
			source.set('stickers', []);
			sizes.sync([]);
		} else if (field === 'tray') source.set('tray', stickers[1].id);
		else source.set('detecting', true);
		flushSync();
		blocked.resolve(new Blob(['png'], { type: 'image/png' }));
		await pending;
		expect(download).not.toHaveBeenCalled();
		expect(controller.archives).toEqual([]);
		expect(controller.phase).toBe('idle');
	}
);

it('checks the input again after the gap before the next download', async () => {
	const { controller, source, download, pause } = await setup(31);
	pause.mockImplementation(async () => {
		source.set('tray', 'new-tray');
		flushSync();
	});
	await controller.exportAll();
	expect(download).toHaveBeenCalledTimes(1);
	expect(controller.archives).toEqual([]);
	expect(controller.phase).toBe('idle');
});

it('keeps an export invalidated when detection starts and finishes before encoding does', async () => {
	const encoder = fakeEncoder();
	const blocked = deferred<Blob>();
	vi.spyOn(encoder, 'png').mockImplementationOnce(() => blocked.promise);
	const { controller, source, download } = await setup(3, encoder);
	const pending = controller.exportAll();
	await vi.waitFor(() => expect(encoder.png).toHaveBeenCalled());
	source.set('detecting', true);
	flushSync();
	source.set('detecting', false);
	flushSync();
	blocked.resolve(new Blob(['png'], { type: 'image/png' }));
	await pending;
	expect(download).not.toHaveBeenCalled();
	expect(controller.archives).toEqual([]);
	expect(controller.canExport).toBe(true);
});

it('does not download after its component effect scope is destroyed', async () => {
	const encoder = fakeEncoder();
	const blocked = deferred<Blob>();
	vi.spyOn(encoder, 'png').mockImplementationOnce(() => blocked.promise);
	const { controller, download } = await setup(3, encoder);
	const pending = controller.exportAll();
	await vi.waitFor(() => expect(encoder.png).toHaveBeenCalled());
	cleanups.pop()!();
	blocked.resolve(new Blob(['png'], { type: 'image/png' }));
	await pending;
	expect(download).not.toHaveBeenCalled();
	expect(controller.phase).toBe('idle');
});
