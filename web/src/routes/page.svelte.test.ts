import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Page from './+page.svelte';
import { createEditorState, setEditorForTesting, type EditorState } from '$lib/state.svelte';
import { createMockDetector } from '$lib/detection';
import { image, installDomMocks } from '$lib/tool/test-support';
import { m } from '$lib/paraglide/messages';
import { setLocale } from '$lib/paraglide/runtime';

const errorToast = vi.hoisted(() => vi.fn());
vi.mock('svelte-sonner', () => ({ toast: { error: errorToast } }));
let editor: EditorState;
const decode = async () => ({ width: 4, height: 4, imageData: image() });
const file = () => new File([], 'sheet.png', { type: 'image/png' });
beforeEach(() => {
	installDomMocks();
	URL.createObjectURL = vi.fn(() => 'blob:local-sheet');
	URL.revokeObjectURL = vi.fn();
	errorToast.mockClear();
	editor = createEditorState({ detector: createMockDetector({ count: 3 }), decode });
	setEditorForTesting(editor);
});
afterEach(() => {
	cleanup();
	editor.dispose();
	setEditorForTesting(null);
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	setLocale('pt-BR', { reload: false });
});

it('loads through the chooser, renders the plural count and preserves curated state across page remount', async () => {
	const first = render(Page);
	await fireEvent.change(first.container.querySelector('input')!, { target: { files: [file()] } });
	await waitFor(() =>
		expect(first.container.querySelectorAll('[data-sticker-card]')).toHaveLength(3)
	);
	expect(first.container.querySelector('[data-detected-count]')).toHaveTextContent(
		m.tool_detected_count({ count: 3 })
	);
	const source = editor.source;
	editor.removeSticker(editor.stickers[0].id);
	editor.setTrayIcon(editor.stickers[1].id);
	const tray = editor.trayIconId;
	first.unmount();
	setLocale('en', { reload: false });
	const second = render(Page);
	await waitFor(() =>
		expect(second.container.querySelectorAll('[data-sticker-card]')).toHaveLength(2)
	);
	expect(editor.source).toBe(source);
	expect(editor.trayIconId).toBe(tray);
	expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	expect(second.container.querySelector('[data-detected-count]')).toHaveTextContent(
		m.tool_detected_count({ count: 2 })
	);
});
it.each(['pt-BR', 'en', 'es'] as const)(
	'shows a localized NoStickers notification in %s and keeps the source',
	async (locale) => {
		setLocale(locale, { reload: false });
		editor.dispose();
		editor = createEditorState({
			detector: createMockDetector({ failWith: 'NoStickers' }),
			decode
		});
		setEditorForTesting(editor);
		const { container } = render(Page);
		await editor.loadFile(file());
		await waitFor(() => expect(errorToast).toHaveBeenCalledWith(m.error_no_stickers()));
		expect(container.querySelectorAll('[data-sticker-card]')).toHaveLength(0);
		expect(screen.getByText(m.tool_grid_empty())).toBeInTheDocument();
		expect(editor.source).not.toBeNull();
	}
);
it.each(['pt-BR', 'en', 'es'] as const)(
	'shows localized no-proposal feedback and keeps the original in %s',
	async (locale) => {
		setLocale(locale, { reload: false });
		editor.dispose();
		editor = createEditorState({ detector: createMockDetector({ count: 1 }), decode });
		setEditorForTesting(editor);
		const { container } = render(Page);
		await editor.loadFile(file());
		const original = editor.stickers[0];
		await fireEvent.click(screen.getByRole('button', { name: m.tool_split_request() }));
		await screen.findByText(m.tool_split_unavailable());
		expect(editor.stickers).toEqual([original]);
		expect(container.querySelectorAll('[data-sticker-card]')).toHaveLength(1);
	}
);
it('rejects pasted non-image files, ignores text and editable targets, and removes its paste listener on unmount', async () => {
	const { unmount } = render(Page);
	const clipboardData = {
		items: [
			{
				kind: 'file',
				type: 'text/plain',
				getAsFile: () => new File([], 'note.txt', { type: 'text/plain' })
			}
		]
	};
	await fireEvent(window, new Event('paste', { bubbles: true }));
	expect(errorToast).not.toHaveBeenCalled();
	await fireEvent.paste(window, { clipboardData });
	await waitFor(() =>
		expect(errorToast).toHaveBeenCalledExactlyOnceWith(m.tool_error_unsupported_file())
	);
	await fireEvent.paste(window, {
		clipboardData: { items: [{ kind: 'string', type: 'text/plain' }] }
	});
	expect(errorToast).toHaveBeenCalledOnce();
	const input = document.createElement('textarea');
	document.body.append(input);
	await fireEvent.paste(input, { clipboardData });
	input.remove();
	expect(errorToast).toHaveBeenCalledOnce();
	unmount();
	const sequence = editor.errorSequence;
	await fireEvent.paste(window, { clipboardData });
	expect(editor.errorSequence).toBe(sequence);
});
it('mounts export with background size badges and blocks export after removing stickers below the minimum', async () => {
	const { container } = render(Page);
	await editor.loadFile(file());
	const action = await screen.findByRole('button', { name: m.export_download_button() });
	await waitFor(() => expect(action).toBeEnabled());
	await waitFor(() => expect(container.querySelectorAll('[data-size-badge]')).toHaveLength(3));
	editor.removeSticker(editor.stickers[0].id);
	await waitFor(() => expect(action).toBeDisabled());
	expect(screen.getByText(m.export_min_stickers_notice({ min: 3 }))).toBeInTheDocument();
});
it('uses an accepted split in the sticker count and export eligibility', async () => {
	editor.dispose();
	editor = createEditorState({ detector: createMockDetector({ count: 2, splitCount: 2 }), decode });
	setEditorForTesting(editor);
	const { container } = render(Page);
	await editor.loadFile(file());
	const exportButton = await screen.findByRole('button', { name: m.export_download_button() });
	expect(exportButton).toBeDisabled();
	await fireEvent.click(screen.getAllByRole('button', { name: m.tool_split_request() })[0]);
	await screen.findByText(m.tool_split_review());
	await fireEvent.click(screen.getByRole('button', { name: m.tool_split_accept() }));
	await waitFor(() => expect(container.querySelectorAll('[data-sticker-card]')).toHaveLength(3));
	expect(exportButton).toBeEnabled();
});
import '@testing-library/jest-dom/vitest';
