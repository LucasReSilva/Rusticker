import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Preview from './Preview.svelte';
import { image, installDomMocks } from '$lib/tool/test-support';
import { m } from '$lib/paraglide/messages';

beforeEach(installDomMocks);
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
const props = {
	src: 'blob:local',
	width: 4,
	height: 4,
	imageData: image(),
	boxes: [{ x: 1, y: 2, width: 3, height: 1 }],
	background: { r: 0, g: 177, b: 64 },
	busy: false
};
it('draws boxes in source coordinates and keeps the inactive overlay decorative', () => {
	const { container } = render(Preview, { ...props, onPick: vi.fn() });
	const box = container.querySelector('rect')!;
	expect(box).toHaveAttribute('x', '1');
	expect(box).toHaveAttribute('y', '2');
	expect(box).toHaveAttribute('width', '3');
	expect(box).toHaveAttribute('height', '1');
	expect(container.querySelector('svg.absolute')).toHaveAttribute('viewBox', '0 0 4 4');
	expect(screen.getAllByRole('img')).toHaveLength(1);
});
it('clamps the keyboard crosshair, picks the source neighborhood and returns focus', async () => {
	const onPick = vi.fn();
	const { container } = render(Preview, { ...props, advanced: true, onPick });
	const toggle = screen.getByRole('button', { name: m.tool_eyedropper_label() });
	await fireEvent.click(toggle);
	const area = screen.getByRole('application');
	expect(area).toHaveFocus();
	await fireEvent.keyDown(area, { key: 'ArrowRight', shiftKey: true });
	await fireEvent.keyDown(area, { key: 'ArrowDown', shiftKey: true });
	expect(container.querySelector('[data-crosshair]')).toHaveAttribute('data-x', '3');
	expect(container.querySelector('[data-crosshair]')).toHaveAttribute('data-y', '3');
	await fireEvent.keyDown(area, { key: 'Enter' });
	expect(onPick).toHaveBeenCalledExactlyOnceWith({ r: 10, g: 20, b: 30 });
	expect(toggle).toHaveFocus();
});
it('Escape cancels without sampling', async () => {
	const onPick = vi.fn();
	render(Preview, { ...props, advanced: true, onPick });
	const toggle = screen.getByRole('button', { name: m.tool_eyedropper_label() });
	await fireEvent.click(toggle);
	await fireEvent.keyDown(screen.getByRole('application'), { key: 'Escape' });
	expect(onPick).not.toHaveBeenCalled();
	expect(toggle).toHaveFocus();
});
it('hides the eyedropper in automatic mode', () => {
	render(Preview, { ...props, onPick: vi.fn() });
	expect(screen.queryByRole('button', { name: m.tool_eyedropper_label() })).not.toBeInTheDocument();
});
it('keeps boxes aligned while zooming and pans the focused image with arrow keys', async () => {
	const { container } = render(Preview, { ...props, onPick: vi.fn() });
	const area = screen.getByRole('region', { name: m.tool_inspector_area() });
	Object.defineProperties(area, {
		clientWidth: { value: 200 },
		clientHeight: { value: 100 },
		scrollWidth: { value: 400 },
		scrollHeight: { value: 200 }
	});
	await fireEvent.click(screen.getByRole('button', { name: m.tool_inspector_zoom_in() }));
	expect(area).toHaveAttribute('data-zoom', '2');
	expect(container.querySelector('[data-detection-box]')).toHaveAttribute('x', '1');
	area.scrollLeft = 0;
	await fireEvent.keyDown(area, { key: 'ArrowRight' });
	expect(area.scrollLeft).toBe(50);
	await fireEvent.click(screen.getByRole('button', { name: m.tool_inspector_zoom_reset() }));
	expect(area).toHaveAttribute('data-zoom', '1');
});
import '@testing-library/jest-dom/vitest';
