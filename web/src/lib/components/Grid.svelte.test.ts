import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SvelteMap } from 'svelte/reactivity';
import Grid from './Grid.svelte';
import { installDomMocks, stickers } from '$lib/tool/test-support';
import type { StickerSizeInfo } from '$lib/tool/size';
import { m } from '$lib/paraglide/messages';
import { formatKilobytes } from '$lib/format';

beforeEach(installDomMocks);
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
function mount(
	count = 6,
	sizeOf?: (id: string) => StickerSizeInfo | undefined,
	allowSplitRequest = true
) {
	let kept = stickers(count);
	let trayIconId = kept[0]?.id ?? null;
	const onRemove = vi.fn((id: string) => {
		kept = kept.filter((sticker) => sticker.id !== id);
		void result.rerender(props());
	});
	const onSetTrayIcon = vi.fn((id: string) => {
		trayIconId = id;
		void result.rerender(props());
	});
	const props = () => ({
		stickers: kept,
		trayIconId,
		busy: false,
		pending: false,
		sizeOf,
		allowSplitRequest,
		onRemove,
		onSetTrayIcon
	});
	const result = render(Grid, props());
	const cards = () =>
		Array.from(result.container.querySelectorAll<HTMLElement>('[data-sticker-card]'));
	return { ...result, cards, onRemove, onSetTrayIcon };
}
it('uses a remembered roving tab stop and follows measured rows, arrows, Home and End', async () => {
	const { cards } = mount();
	cards().forEach((card, index) => {
		Object.defineProperty(card, 'offsetTop', { value: Math.floor(index / 3) * 100 });
		Object.defineProperty(card, 'offsetLeft', { value: (index % 3) * 100 });
	});
	cards()[0].focus();
	await fireEvent.keyDown(cards()[0], { key: 'ArrowRight' });
	expect(cards()[1]).toHaveFocus();
	await fireEvent.keyDown(cards()[1], { key: 'ArrowDown' });
	expect(cards()[4]).toHaveFocus();
	await fireEvent.keyDown(cards()[4], { key: 'ArrowUp' });
	expect(cards()[1]).toHaveFocus();
	await fireEvent.keyDown(cards()[1], { key: 'End' });
	expect(cards()[5]).toHaveFocus();
	await fireEvent.keyDown(cards()[5], { key: 'Home' });
	expect(cards()[0]).toHaveFocus();
	await fireEvent.keyDown(cards()[0], { key: 'ArrowRight' });
	expect(cards().filter((card) => card.tabIndex === 0)).toEqual([cards()[1]]);
	for (const card of [cards()[0], cards()[2]])
		expect(
			Array.from(card.querySelectorAll('button')).every((button) => button.tabIndex === -1)
		).toBe(true);
	cards()[1].blur();
	expect(cards()[1].tabIndex).toBe(0);
});
it('Delete opens confirmation; cancel focuses its remove action, confirm focuses the next card', async () => {
	const { cards, onRemove } = mount(3);
	cards()[1].focus();
	await fireEvent.keyDown(cards()[1], { key: 'Delete' });
	expect(await screen.findByRole('dialog')).toHaveTextContent(
		m.tool_remove_title({ position: '2' })
	);
	await fireEvent.click(screen.getByRole('button', { name: m.tool_remove_cancel() }));
	await waitFor(() => expect(cards()[1].querySelector('[data-remove-action]')).toHaveFocus());
	expect(onRemove).not.toHaveBeenCalled();
	await fireEvent.click(cards()[1].querySelector('[data-remove-action]')!);
	await fireEvent.click(await screen.findByRole('button', { name: m.tool_remove_confirm() }));
	await waitFor(() => expect(cards()).toHaveLength(2));
	await waitFor(() => expect(cards()[1]).toHaveFocus());
	expect(onRemove).toHaveBeenCalledExactlyOnceWith('test-s1');
});
it('focuses the previous card after the last index, then the heading after the final removal', async () => {
	const { cards } = mount(2);
	for (let remaining = 2; remaining > 0; remaining--) {
		const card = cards()[remaining - 1];
		card.focus();
		await fireEvent.keyDown(card, { key: 'Backspace' });
		await fireEvent.click(await screen.findByRole('button', { name: m.tool_remove_confirm() }));
		await waitFor(() => expect(cards()).toHaveLength(remaining - 1));
		await waitFor(() =>
			expect(
				remaining > 1 ? cards()[0] : screen.getByRole('heading', { name: m.tool_grid_heading() })
			).toHaveFocus()
		);
	}
	expect(screen.getByText(m.tool_grid_empty())).toBeInTheDocument();
});
it('chooses a unique tray icon and renders no size badges without the optional lookup', async () => {
	const { cards, container, onSetTrayIcon } = mount(2);
	expect(cards()[0].querySelector('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
	await fireEvent.click(cards()[1].querySelector('[aria-pressed]')!);
	expect(onSetTrayIcon).toHaveBeenCalledExactlyOnceWith('test-s1');
	expect(cards()[1].querySelector('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
	expect(cards()[0].querySelector('[aria-pressed]')).toHaveAttribute('aria-pressed', 'false');
	expect(screen.getAllByText(m.tool_tray_icon_badge())).toHaveLength(1);
	expect(container.querySelector('[data-size-badge]')).toBeNull();
});
it('reactively renders pending, ready, over-limit and error size information', async () => {
	const sizes = new SvelteMap<string, StickerSizeInfo>([
		['test-s0', { status: 'pending' }],
		['test-s1', { status: 'ready', bytes: 99_500, overLimit: false }],
		['test-s2', { status: 'ready', bytes: 123_450, overLimit: true }],
		['test-s3', { status: 'error' }]
	]);
	const { container } = mount(4, (id) => sizes.get(id));
	expect(screen.getByLabelText(m.tool_size_pending_label())).toBeInTheDocument();
	expect(
		screen.getByLabelText(m.tool_size_label({ size: formatKilobytes(99_500) }))
	).toHaveTextContent(formatKilobytes(99_500));
	expect(
		screen.getByLabelText(m.tool_size_over_limit_label({ size: formatKilobytes(123_450) }))
	).toHaveClass('bg-destructive');
	expect(screen.getByText(m.tool_size_unavailable())).toBeInTheDocument();
	expect(container.querySelectorAll('[data-size-badge]')).toHaveLength(4);
	sizes.set('test-s0', { status: 'ready', bytes: 12_500, overLimit: false });
	await waitFor(() =>
		expect(
			screen.getByLabelText(m.tool_size_label({ size: formatKilobytes(12_500) }))
		).toBeInTheDocument()
	);
});
it('marks processing busy and shows six placeholders before the first result', () => {
	const { container } = render(Grid, {
		stickers: [],
		trayIconId: null,
		busy: true,
		pending: true,
		onRemove: vi.fn(),
		onSetTrayIcon: vi.fn()
	});
	expect(container.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
	expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
});

it('shows candidate review and wires explicit accept and discard actions', async () => {
	const source = stickers(1)[0];
	const candidates = stickers(2);
	const onSplitAccept = vi.fn();
	const onSplitDiscard = vi.fn();
	const onSplitRequest = vi.fn();
	render(Grid, {
		stickers: [source],
		trayIconId: null,
		busy: false,
		pending: false,
		onRemove: vi.fn(),
		onSetTrayIcon: vi.fn(),
		splitPreview: { source, candidates },
		onSplitRequest,
		onSplitAccept,
		onSplitDiscard
	});
	expect(screen.getByText(m.tool_split_review())).toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: m.tool_split_discard() }));
	await fireEvent.click(screen.getByRole('button', { name: m.tool_split_accept() }));
	expect(onSplitDiscard).toHaveBeenCalledOnce();
	expect(onSplitAccept).toHaveBeenCalledOnce();
});

it('offers an explicit action to request split assistance', async () => {
	const source = stickers(1)[0];
	const onSplitRequest = vi.fn();
	render(Grid, {
		stickers: [source],
		trayIconId: null,
		busy: false,
		pending: false,
		onRemove: vi.fn(),
		onSetTrayIcon: vi.fn(),
		onSplitRequest
	});
	const action = screen.getByRole('button', { name: m.tool_split_request() });
	expect(action).toHaveAttribute('tabindex', '0');
	await fireEvent.click(action);
	expect(onSplitRequest).toHaveBeenCalledWith(source.id);
});
it('hides split requests when automatic mode disables refinement', () => {
	mount(1, undefined, false);
	expect(screen.queryByRole('button', { name: m.tool_split_request() })).not.toBeInTheDocument();
});
import '@testing-library/jest-dom/vitest';
