import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const history = vi.hoisted(() => ({
	clearProcessingHistory: vi.fn(),
	deleteProcessingHistoryEntry: vi.fn(),
	disableProcessingHistory: vi.fn(),
	enableProcessingHistory: vi.fn(),
	listProcessingHistory: vi.fn(),
	processingHistoryEnabled: vi.fn()
}));

vi.mock('$lib/history/store', () => history);

import HistoryPage from '../../routes/history/+page.svelte';

const record = {
	id: 'run-1',
	completedAt: new Date('2026-01-02T03:04:00Z').getTime(),
	width: 800,
	height: 600,
	background: { r: 0, g: 177, b: 64 },
	tolerance: 50,
	stickerCount: 3,
	previouslyProcessed: true,
	fingerprint: 'private-hash-must-not-render',
	fileName: 'private-file-name.png'
};

beforeEach(() => {
	history.clearProcessingHistory.mockResolvedValue(true);
	history.deleteProcessingHistoryEntry.mockResolvedValue(true);
	history.disableProcessingHistory.mockReset();
	history.enableProcessingHistory.mockResolvedValue(true);
	history.listProcessingHistory.mockResolvedValue({ ok: true, value: [] });
	history.processingHistoryEnabled.mockReturnValue(false);
});

afterEach(() => cleanup());

describe('processing history page', () => {
	it('requires opt-in and explains the local-only summary behavior', async () => {
		render(HistoryPage);

		expect(await screen.findByRole('button', { name: 'Ativar histórico' })).toBeTruthy();
		expect(screen.getByText(/imagens de origem, nomes de arquivos/i)).toBeTruthy();
		expect(screen.getByText(/selecione a imagem original/i)).toBeTruthy();
	});

	it('lets users inspect and delete summaries while writes are disabled without revealing private fields', async () => {
		history.listProcessingHistory.mockResolvedValue({ ok: true, value: [record] });
		render(HistoryPage);

		expect(await screen.findByText('Tamanho da imagem: 800 × 600 px')).toBeTruthy();
		expect(screen.getByText('Este mesmo arquivo já havia sido processado.')).toBeTruthy();
		expect(document.body.textContent).not.toContain('private-hash-must-not-render');
		expect(document.body.textContent).not.toContain('private-file-name.png');

		await fireEvent.click(
			screen.getByRole('button', { name: /Excluir o processamento concluído/ })
		);
		await waitFor(() => expect(history.deleteProcessingHistoryEntry).toHaveBeenCalledWith('run-1'));
	});

	it('requires confirmation before clearing all records', async () => {
		history.processingHistoryEnabled.mockReturnValue(true);
		history.listProcessingHistory.mockResolvedValue({ ok: true, value: [record] });
		render(HistoryPage);

		await fireEvent.click(await screen.findByRole('button', { name: 'Apagar todo o histórico' }));
		expect(
			await screen.findByRole('heading', { name: 'Apagar todo o histórico de processamento?' })
		).toBeTruthy();
		expect(history.clearProcessingHistory).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('button', { name: 'Apagar tudo' }));
		await waitFor(() => expect(history.clearProcessingHistory).toHaveBeenCalledOnce());
	});
});
