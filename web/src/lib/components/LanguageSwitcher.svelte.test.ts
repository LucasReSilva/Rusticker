import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LanguageSwitcher, { autonym } from './LanguageSwitcher.svelte';
import { locale } from '$lib/i18n/locale.svelte';

const switchLocale = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$lib/i18n/switch', () => ({ switchLocale }));

beforeEach(() => {
	locale.set('pt-BR');
	switchLocale.mockClear();
});
afterEach(cleanup);

it.each([
	['pt-BR', 'Português (Brasil)'],
	['en', 'English'],
	['es', 'Español']
])('labels %s with its capitalized autonym', (tag, label) => {
	expect(autonym(tag)).toBe(label);
});

it('selects a locale once through the shared switch function without document navigation', async () => {
	const href = window.location.href;
	render(LanguageSwitcher);
	await fireEvent.click(screen.getByTestId('language-switcher'));
	await fireEvent.click(await screen.findByRole('menuitemradio', { name: 'English' }));
	await waitFor(() => expect(switchLocale).toHaveBeenCalledExactlyOnceWith('en'));
	expect(window.location.href).toBe(href);
	expect(document.activeElement).toBe(screen.getByTestId('language-switcher'));
});
