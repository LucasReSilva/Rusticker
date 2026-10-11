import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import DropZone from './DropZone.svelte';

afterEach(cleanup);
it.each(['Enter', ' '])('opens the chooser with %s', async (key) => {
	const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
	render(DropZone, { onFile: vi.fn(), onReject: vi.fn() });
	await fireEvent.keyDown(screen.getByRole('button'), { key });
	expect(click).toHaveBeenCalledOnce();
	click.mockRestore();
});
it('keeps the dragging state until all nested enters leave and selects the first image', async () => {
	const onFile = vi.fn(),
		onReject = vi.fn();
	render(DropZone, { onFile, onReject });
	const area = screen.getByRole('button');
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
	expect(onFile).toHaveBeenCalledExactlyOnceWith(first);
});
import '@testing-library/jest-dom/vitest';
