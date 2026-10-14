import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StickerBoundsEditor from './StickerBoundsEditor.svelte';
import type { Sticker } from '$lib/detection';
import { installDomMocks } from '$lib/tool/test-support';
import { setLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages';

function makeSticker(): Sticker {
	const data = new Uint8ClampedArray(512 * 512 * 4);
	for (let y = 16; y < 496; y++) {
		for (let x = 16; x < 496; x++) {
			const offset = (y * 512 + x) * 4;
			data.set([240, 80, 20, 255], offset);
		}
	}
	return {
		id: 'bounds-sticker',
		index: 0,
		bbox: { x: 10, y: 10, width: 100, height: 100 },
		pixels: { data, width: 512, height: 512 } as ImageData
	};
}

beforeEach(() => {
	installDomMocks();
	setLocale('pt-BR', { reload: false });
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('provides keyboard-operable bound controls and applies the adjusted sticker', async () => {
	const onApply = vi.fn();
	const onCancel = vi.fn();
	render(StickerBoundsEditor, {
		sticker: makeSticker(),
		sourceWidth: 200,
		sourceHeight: 200,
		onApply,
		onCancel
	});

	const xSlider = screen.getByRole('slider', { name: m.tool_bounds_x() });
	expect(xSlider).toHaveAttribute('aria-valuenow', '10');
	await fireEvent.keyDown(xSlider, { key: 'ArrowRight' });
	expect(xSlider).toHaveAttribute('aria-valuenow', '11');
	expect(screen.getByRole('img', { name: m.tool_bounds_preview_alt() })).toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: m.tool_bounds_apply() }));

	expect(onApply).toHaveBeenCalledTimes(1);
	expect(onApply.mock.calls[0][0].bbox).toEqual({ x: 11, y: 10, width: 100, height: 100 });
	expect(onApply.mock.calls[0][0].pixels.width).toBe(512);
});

it('can reset to the detected crop and cancel without applying', async () => {
	const onApply = vi.fn();
	const onCancel = vi.fn();
	render(StickerBoundsEditor, {
		sticker: makeSticker(),
		sourceWidth: 200,
		sourceHeight: 200,
		onApply,
		onCancel
	});

	const xSlider = screen.getByRole('slider', { name: m.tool_bounds_x() });
	await fireEvent.keyDown(xSlider, { key: 'ArrowRight' });
	await fireEvent.click(screen.getByRole('button', { name: m.tool_bounds_reset() }));
	expect(xSlider).toHaveAttribute('aria-valuenow', '10');
	expect(screen.getByRole('button', { name: m.tool_bounds_apply() })).toBeDisabled();
	await fireEvent.click(screen.getByRole('button', { name: m.tool_remove_cancel() }));
	expect(onCancel).toHaveBeenCalledOnce();
	expect(onApply).not.toHaveBeenCalled();
});

it.each(['pt-BR', 'es'] as const)('localizes all bound controls in %s', async (locale) => {
	setLocale(locale, { reload: false });
	render(StickerBoundsEditor, {
		sticker: makeSticker(),
		sourceWidth: 200,
		sourceHeight: 200,
		onApply: vi.fn(),
		onCancel: vi.fn()
	});

	expect(screen.getAllByRole('slider')).toHaveLength(4);
	expect(screen.getByRole('slider', { name: m.tool_bounds_x() })).toBeInTheDocument();
	expect(screen.getByRole('img', { name: m.tool_bounds_preview_alt() })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: m.tool_bounds_apply() })).toBeInTheDocument();
});
