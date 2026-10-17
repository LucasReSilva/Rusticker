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

it('shows the original source and adjusts a zoomed crop from the keyboard', async () => {
	const onApply = vi.fn();
	const { container } = render(StickerBoundsEditor, {
		sticker: makeSticker(),
		sourceUrl: 'blob:local-source',
		sourceWidth: 200,
		sourceHeight: 200,
		onApply,
		onCancel: vi.fn()
	});
	expect(screen.getByRole('img', { name: m.tool_bounds_source_alt() })).toHaveAttribute(
		'src',
		'blob:local-source'
	);
	await fireEvent.click(screen.getByRole('button', { name: m.tool_inspector_zoom_in() }));
	expect(container.querySelector('[data-crop-inspector]')).toHaveAttribute('data-zoom', '2');
	await fireEvent.keyDown(screen.getByRole('button', { name: m.tool_bounds_move() }), {
		key: 'ArrowRight'
	});
	await fireEvent.keyDown(screen.getByRole('button', { name: m.tool_bounds_resize_se() }), {
		key: 'ArrowDown',
		shiftKey: true
	});
	expect(container.querySelector('[data-crop-box]')).toHaveAttribute('data-x', '11');
	expect(container.querySelector('[data-crop-box]')).toHaveAttribute('data-height', '110');
	await fireEvent.click(screen.getByRole('button', { name: m.tool_bounds_apply() }));
	expect(onApply.mock.calls[0][0].bbox).toEqual({ x: 11, y: 10, width: 100, height: 110 });
});

it('maps pointer movement on the magnified source to integer crop pixels', async () => {
	const { container } = render(StickerBoundsEditor, {
		sticker: makeSticker(),
		sourceUrl: 'blob:local-source',
		sourceWidth: 200,
		sourceHeight: 200,
		onApply: vi.fn(),
		onCancel: vi.fn()
	});
	const frame = container.querySelector('[data-crop-inspector] > div')!;
	vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		width: 400,
		height: 400,
		top: 0,
		left: 0,
		right: 400,
		bottom: 400,
		toJSON: () => ({})
	});
	const move = screen.getByRole('button', { name: m.tool_bounds_move() });
	move.setPointerCapture = vi.fn();
	await fireEvent.pointerDown(move, { pointerId: 1, clientX: 100, clientY: 100 });
	await fireEvent.pointerMove(move, { pointerId: 1, clientX: 120, clientY: 100 });
	await fireEvent.pointerUp(move, { pointerId: 1 });
	expect(container.querySelector('[data-crop-box]')).toHaveAttribute('data-x', '20');
});
