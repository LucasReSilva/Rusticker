import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import DropZone from './DropZone.svelte';
import { m } from '$lib/paraglide/messages';

afterEach(cleanup);
it.each(['Enter', ' '])('opens the chooser with %s', async (key) => {
	const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
	render(DropZone, { onFiles: vi.fn(), onReject: vi.fn() });
	await fireEvent.keyDown(screen.getByRole('button', { name: m.tool_dropzone_title() }), { key });
	expect(click).toHaveBeenCalledOnce();
	click.mockRestore();
});
it('opens the existing picker through the agent action when browser activation permits it', () => {
	const { component } = render(DropZone, { onFiles: vi.fn(), onReject: vi.fn() });
	const input = document.querySelector('input[type="file"]');
	const showPicker = vi.fn();
	if (!input) throw new Error('Picker input not found');
	Object.defineProperty(input, 'showPicker', { value: showPicker });

	expect(component.openPicker()).toBe(true);
	expect(showPicker).toHaveBeenCalledOnce();
});
it('reports picker activation failure without affecting the visible picker', () => {
	const { component } = render(DropZone, { onFiles: vi.fn(), onReject: vi.fn() });
	const input = document.querySelector('input[type="file"]');
	if (!input) throw new Error('Picker input not found');
	Object.defineProperty(input, 'showPicker', {
		value: vi.fn(() => {
			throw new DOMException('User activation is required.', 'NotAllowedError');
		})
	});

	expect(component.openPicker()).toBe(false);
});
it('keeps the dragging state until all nested enters leave and selects the first image', async () => {
	const onFile = vi.fn(),
		onReject = vi.fn();
	render(DropZone, { onFiles: onFile, onReject, multiple: true });
	const area = screen.getByRole('button', { name: m.tool_dropzone_title() });
	await fireEvent.dragEnter(area);
	await fireEvent.dragEnter(area);
	await fireEvent.dragLeave(area);
	expect(area).toHaveAttribute('data-state', 'dragging');
	await fireEvent.dragLeave(area);
	expect(area).toHaveAttribute('data-state', 'idle');
	const text = new File([], 'note.txt', { type: 'text/plain' });
	await fireEvent.drop(area, { dataTransfer: { files: [text] } });
	expect(onReject).toHaveBeenCalledOnce();
	const first = new File([], 'one.png', { type: 'image/png' }),
		second = new File([], 'two.png', { type: 'image/png' });
	await fireEvent.drop(area, { dataTransfer: { files: [text, first, second] } });
	expect(onFile).toHaveBeenCalledExactlyOnceWith([first, second]);
});
it('loads the sample image when sample button is clicked', async () => {
	const onFile = vi.fn(),
		onReject = vi.fn();
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		blob: () => Promise.resolve(new Blob(['fake-png-bytes'], { type: 'image/png' }))
	});
	vi.stubGlobal('fetch', fetchMock);
	render(DropZone, { onFiles: onFile, onReject });
	const sampleBtn = screen.getByRole('button', { name: m.dropzone_try_sample() });
	await fireEvent.click(sampleBtn);
	expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('rust-stickers.png'));
	expect(onFile).toHaveBeenCalledOnce();
	const passed = onFile.mock.calls[0][0][0];
	expect(passed.name).toBe('rust-stickers.png');
	expect(passed.type).toBe('image/png');
	vi.unstubAllGlobals();
});
it('calls onReject when sample fetch fails', async () => {
	const onFile = vi.fn(),
		onReject = vi.fn();
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
	render(DropZone, { onFiles: onFile, onReject });
	const sampleBtn = screen.getByRole('button', { name: m.dropzone_try_sample() });
	await fireEvent.click(sampleBtn);
	expect(onReject).toHaveBeenCalledOnce();
	expect(onFile).not.toHaveBeenCalled();
	vi.unstubAllGlobals();
});
import '@testing-library/jest-dom/vitest';
