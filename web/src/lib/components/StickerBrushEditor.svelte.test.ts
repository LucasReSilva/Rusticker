import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StickerBrushEditor from './StickerBrushEditor.svelte';
import type { Sticker } from '$lib/detection';
import { installDomMocks } from '$lib/tool/test-support';
import { setLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages';

function makeImage(color: [number, number, number, number]): ImageData {
	const data = new Uint8ClampedArray(512 * 512 * 4);
	for (let offset = 0; offset < data.length; offset += 4) data.set(color, offset);
	return { data, width: 512, height: 512 } as ImageData;
}

function makeSticker(): Sticker {
	return {
		id: 'brush-sticker',
		index: 0,
		bbox: { x: 0, y: 0, width: 512, height: 512 },
		pixels: makeImage([120, 80, 40, 255])
	};
}

function setCanvasBounds(canvas: HTMLCanvasElement) {
	vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		width: 512,
		height: 512,
		top: 0,
		left: 0,
		right: 512,
		bottom: 512,
		toJSON: () => ({})
	});
	canvas.setPointerCapture = vi.fn();
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

it('erases and restores source pixels with independent undo, redo, reset, and apply states', async () => {
	const sticker = makeSticker();
	const originalAlpha = sticker.pixels.data[(256 * 512 + 256) * 4 + 3];
	const source = makeImage([1, 2, 3, 255]);
	const onApply = vi.fn();
	const { container } = render(StickerBrushEditor, {
		sticker,
		source,
		onApply,
		resetPixels: sticker.pixels,
		onCancel: vi.fn()
	});
	const canvas = container.querySelector('canvas')!;
	setCanvasBounds(canvas);
	const sample = (pixels: ImageData) =>
		Array.from(pixels.data.slice((256 * 512 + 256) * 4, (256 * 512 + 256) * 4 + 4));
	const applyButton = screen.getByRole('button', { name: m.tool_brush_apply() });
	const undoButton = screen.getByRole('button', { name: m.tool_brush_undo() });
	const redoButton = screen.getByRole('button', { name: m.tool_brush_redo() });

	expect(screen.getByRole('button', { name: m.tool_brush_erase() })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(applyButton).toBeDisabled();
	expect(undoButton).toBeDisabled();
	expect(redoButton).toBeDisabled();
	await fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 256, clientY: 256 });
	await fireEvent.pointerUp(canvas, { pointerId: 1, button: 0, clientX: 256, clientY: 256 });

	expect(applyButton).toBeEnabled();
	expect(undoButton).toBeEnabled();
	await fireEvent.click(applyButton);
	expect(sample(onApply.mock.calls[0][0])).toEqual([0, 0, 0, 0]);
	expect(sticker.pixels.data[(256 * 512 + 256) * 4 + 3]).toBe(originalAlpha);
	expect(source.data.slice(0, 4)).toEqual(new Uint8ClampedArray([1, 2, 3, 255]));

	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_restore() }));
	expect(screen.getByRole('button', { name: m.tool_brush_restore() })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await fireEvent.pointerDown(canvas, { pointerId: 2, button: 0, clientX: 256, clientY: 256 });
	await fireEvent.pointerUp(canvas, { pointerId: 2, button: 0, clientX: 256, clientY: 256 });
	await fireEvent.click(applyButton);
	expect(sample(onApply.mock.calls[1][0])).toEqual([1, 2, 3, 255]);

	await fireEvent.click(undoButton);
	expect(redoButton).toBeEnabled();
	await fireEvent.click(redoButton);
	expect(undoButton).toBeEnabled();
	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_reset() }));
	expect(applyButton).toBeDisabled();
	expect(undoButton).toBeDisabled();
});

it('exposes brush size and zoom controls and cancels without applying', async () => {
	const onApply = vi.fn();
	const onCancel = vi.fn();
	const { container } = render(StickerBrushEditor, {
		sticker: makeSticker(),
		source: makeImage([1, 2, 3, 255]),
		resetPixels: makeSticker().pixels,
		onApply,
		onCancel
	});
	const slider = screen.getByRole('slider', { name: m.tool_brush_size() });
	expect(slider).toHaveAttribute('aria-valuenow', '32');
	await fireEvent.keyDown(slider, { key: 'ArrowRight' });
	expect(slider).toHaveAttribute('aria-valuenow', '36');
	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_zoom_in() }));
	expect(container.querySelector('[data-brush-area]')).toHaveAttribute('data-zoom', '2');
	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_zoom_out() }));
	expect(container.querySelector('[data-brush-area]')).toHaveAttribute('data-zoom', '1');
	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_cancel() }));
	expect(onCancel).toHaveBeenCalledOnce();
	expect(onApply).not.toHaveBeenCalled();
});

it('captures middle-button pan on the canvas that receives pointer movement', async () => {
	const { container } = render(StickerBrushEditor, {
		sticker: makeSticker(),
		source: makeImage([1, 2, 3, 255]),
		resetPixels: makeSticker().pixels,
		onApply: vi.fn(),
		onCancel: vi.fn()
	});
	const canvas = container.querySelector('canvas')!;
	const viewport = container.querySelector('[data-brush-area]') as HTMLDivElement;
	setCanvasBounds(canvas);
	Object.defineProperties(viewport, {
		clientWidth: { configurable: true, value: 100 },
		clientHeight: { configurable: true, value: 100 },
		scrollWidth: { configurable: true, value: 512 },
		scrollHeight: { configurable: true, value: 512 }
	});
	viewport.setPointerCapture = vi.fn();
	await fireEvent.pointerDown(canvas, { pointerId: 3, button: 1, clientX: 200, clientY: 200 });
	await fireEvent.pointerMove(canvas, { pointerId: 3, button: 1, clientX: 170, clientY: 180 });
	await fireEvent.pointerUp(canvas, { pointerId: 3, button: 1, clientX: 170, clientY: 180 });

	expect(canvas.setPointerCapture).toHaveBeenCalledWith(3);
	expect(viewport.setPointerCapture).not.toHaveBeenCalled();
	expect(viewport.scrollLeft).toBe(30);
	expect(viewport.scrollTop).toBe(20);
});

it('keeps the undo history bounded to twenty full-image states', async () => {
	const { container } = render(StickerBrushEditor, {
		sticker: makeSticker(),
		source: makeImage([1, 2, 3, 255]),
		resetPixels: makeSticker().pixels,
		onApply: vi.fn(),
		onCancel: vi.fn()
	});
	const canvas = container.querySelector('canvas')!;
	setCanvasBounds(canvas);
	for (let pointerId = 1; pointerId <= 21; pointerId++) {
		await fireEvent.pointerDown(canvas, { pointerId, button: 0, clientX: 256, clientY: 256 });
		await fireEvent.pointerUp(canvas, { pointerId, button: 0, clientX: 256, clientY: 256 });
	}
	const undo = screen.getByRole('button', { name: m.tool_brush_undo() });
	for (let index = 0; index < 19; index++) await fireEvent.click(undo);
	expect(undo).toBeDisabled();
});

it('can reset a previously applied edit to its original detected cutout after reopening', async () => {
	const editedSticker = makeSticker();
	const originalPixels = makeImage([1, 2, 3, 255]);
	const onApply = vi.fn();
	const { container } = render(StickerBrushEditor, {
		sticker: editedSticker,
		source: originalPixels,
		resetPixels: originalPixels,
		onApply,
		onCancel: vi.fn()
	});
	expect(screen.getByRole('button', { name: m.tool_brush_apply() })).toBeDisabled();
	const resetButton = screen.getByRole('button', { name: m.tool_brush_reset() });
	expect(resetButton).toBeEnabled();
	await fireEvent.click(resetButton);
	await fireEvent.click(screen.getByRole('button', { name: m.tool_brush_apply() }));
	const applied = onApply.mock.calls[0][0] as ImageData;
	expect(Array.from(applied.data.slice(0, 4))).toEqual([1, 2, 3, 255]);
	expect(container.querySelector('[data-brush-editor]')).toBeInTheDocument();
});

it.each(['pt-BR', 'en', 'es'] as const)('localizes the brush controls in %s', (locale) => {
	setLocale(locale, { reload: false });
	render(StickerBrushEditor, {
		sticker: makeSticker(),
		source: makeImage([1, 2, 3, 255]),
		resetPixels: makeSticker().pixels,
		onApply: vi.fn(),
		onCancel: vi.fn()
	});

	expect(screen.getByRole('slider', { name: m.tool_brush_size() })).toBeInTheDocument();
	expect(screen.getByRole('region', { name: m.tool_brush_area() })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: m.tool_brush_apply() })).toBeDisabled();
	expect(screen.getByRole('button', { name: m.tool_brush_cancel() })).toBeInTheDocument();
});
