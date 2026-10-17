import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PdfSheetExport from './PdfSheetExport.svelte';
import { installDomMocks, stickers } from '$lib/tool/test-support';
import { m } from '$lib/paraglide/messages';
import { setLocale } from '$lib/paraglide/runtime';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
	installDomMocks();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		putImageData: vi.fn(),
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		strokeRect: vi.fn(),
		setLineDash: vi.fn(),
		drawImage: vi.fn()
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	setLocale('pt-BR', { reload: false });
});

it.each(['pt-BR', 'en', 'es'] as const)(
	'renders the complete localized PDF sheet controls in %s',
	async (locale) => {
		setLocale(locale, { reload: false });
		render(PdfSheetExport, { props: { stickers: stickers(3) } });

		expect(screen.getByRole('heading', { name: m.pdf_sheet_heading() })).toBeInTheDocument();
		expect(screen.getByRole('group', { name: m.pdf_sheet_paper_label() })).toBeInTheDocument();
		expect(
			screen.getByRole('group', { name: m.pdf_sheet_orientation_label() })
		).toBeInTheDocument();
		expect(screen.getByText(m.pdf_sheet_edit_instructions())).toBeInTheDocument();
		expect(screen.getByRole('button', { name: m.pdf_sheet_export_button() })).toBeEnabled();
		expect(m.pdf_sheet_export_success({ pages: 1 })).not.toBe(
			m.pdf_sheet_export_success({ pages: 2 })
		);

		const moveRight = screen.getByRole('button', { name: m.pdf_sheet_move_right() });
		expect(moveRight).toBeDisabled();
		await fireEvent.click(
			screen.getByRole('button', { name: m.pdf_sheet_select_sticker({ sticker: 1 }) })
		);
		expect(moveRight).toBeEnabled();
		await fireEvent.click(screen.getByRole('button', { name: m.pdf_sheet_landscape() }));
		expect(
			screen.getByText(m.pdf_sheet_page_size({ width: '297', height: '210' }))
		).toBeInTheDocument();
		expect(
			screen.getByLabelText(m.pdf_sheet_page_label({ page: '1', total: '1' }))
		).toBeInTheDocument();
	}
);
