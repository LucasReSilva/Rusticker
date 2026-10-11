import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { toast } from 'svelte-sonner';
import Toaster from './sonner.svelte';
import { locale } from '$lib/i18n/locale.svelte';

beforeEach(() => {
	locale.set('pt-BR');
	vi.stubGlobal('matchMedia', () => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}));
});
afterEach(() => {
	toast.dismiss();
	cleanup();
	vi.unstubAllGlobals();
});

it('updates region and existing toast close labels after an in-app locale switch', async () => {
	render(Toaster, { closeButton: true });
	toast('Locale regression', { id: 'locale-regression', duration: Infinity });
	await screen.findByRole('button', { name: 'Fechar' });
	expect(document.querySelector('section')?.getAttribute('aria-label')).toContain('Notificações');
	locale.set('es');
	await screen.findByRole('button', { name: 'Cerrar' });
	await waitFor(() =>
		expect(document.querySelector('section')?.getAttribute('aria-label')).toContain(
			'Notificaciones'
		)
	);
	locale.set('en');
	await screen.findByRole('button', { name: 'Close' });
	await waitFor(() =>
		expect(document.querySelector('section')?.getAttribute('aria-label')).toContain('Notifications')
	);
});

it('preserves caller label overrides when the locale changes', async () => {
	render(Toaster, {
		closeButton: true,
		containerAriaLabel: 'Custom region',
		closeButtonAriaLabel: 'Custom close'
	});
	toast('Override regression', { id: 'override-regression', duration: Infinity });
	await screen.findByRole('button', { name: 'Custom close' });
	locale.set('es');
	await waitFor(() =>
		expect(document.querySelector('section')?.getAttribute('aria-label')).toContain('Custom region')
	);
	const notification = screen.getByText('Override regression').closest('li');
	expect(notification).not.toBeNull();
	expect(within(notification!).getByRole('button', { name: 'Custom close' })).toBeTruthy();
});
