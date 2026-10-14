import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import Component from './BatchQueue.svelte';
import type { BatchEntry } from '$lib/state.svelte';
import { m } from '$lib/paraglide/messages';

const entry = (id: string, status: BatchEntry['status']): BatchEntry => ({
	id,
	file: new File([], `${id}.png`, { type: 'image/png' }),
	status,
	error: null,
	stickers: [],
	trayIconId: null
});

const callbacks = {
	activeId: null,
	running: false,
	onActivate: vi.fn(),
	onRetry: vi.fn(),
	onRemove: vi.fn(),
	onCancel: vi.fn(),
	onClear: vi.fn()
};

afterEach(cleanup);

it('reports handled images separately from successful results', async () => {
	const view = render(Component, {
		...callbacks,
		entries: [entry('one', 'done'), entry('two', 'error'), entry('three', 'queued')]
	});
	const progress = screen.getByRole('progressbar', { name: m.batch_progress_heading() });
	expect(progress).toHaveAttribute('aria-valuenow', '2');
	expect(progress).toHaveAttribute('aria-valuemax', '3');
	expect(progress).toHaveAttribute(
		'aria-valuetext',
		m.batch_progress_count({ handled: 2, total: 3 })
	);
	expect(screen.getByText(m.batch_progress_results({ count: 1 }))).toBeTruthy();
	expect(screen.getByText(m.batch_progress_attention({ count: 1 }))).toBeTruthy();

	await view.rerender({
		...callbacks,
		entries: [entry('one', 'done'), entry('two', 'queued'), entry('three', 'queued')]
	});
	expect(progress).toHaveAttribute('aria-valuenow', '1');
	expect(screen.queryByText(m.batch_progress_attention({ count: 1 }))).toBeNull();

	await view.rerender({ ...callbacks, entries: [] });
	expect(screen.queryByRole('progressbar')).toBeNull();
});
