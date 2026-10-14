import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Controls from './Controls.svelte';
import { installDomMocks } from '$lib/tool/test-support';
import { setLocale } from '$lib/paraglide/runtime';
import { formatPercent } from '$lib/format';
import { m } from '$lib/paraglide/messages';

beforeEach(installDomMocks);
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	setLocale('pt-BR', { reload: false });
});
const props = { tolerance: 50, background: { r: 0, g: 177, b: 64 }, busy: false, hasImage: true };
it('changes one step with the keyboard and exposes formatted aria-valuetext', async () => {
	const onToleranceChange = vi.fn();
	render(Controls, { ...props, mode: 'advanced', onToleranceChange });
	const slider = screen.getByRole('slider');
	expect(slider).toHaveAttribute('aria-valuetext', formatPercent(0.5));
	await fireEvent.keyDown(slider, { key: 'ArrowRight' });
	expect(onToleranceChange).toHaveBeenCalledWith(51);
});
it.each(['en', 'pt-BR'] as const)(
	'formats the percent text in %s and only shows progress while busy',
	async (locale) => {
		setLocale(locale, { reload: false });
		const { rerender } = render(Controls, {
			...props,
			mode: 'advanced',
			onToleranceChange: vi.fn()
		});
		expect(screen.getByText(formatPercent(0.5, locale))).toBeInTheDocument();
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		await rerender({ ...props, mode: 'advanced', busy: true, onToleranceChange: vi.fn() });
		const progress = screen.getByRole('progressbar');
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveAttribute('data-state', 'indeterminate');
		expect(progress).not.toHaveAttribute('aria-valuenow');
	}
);
it('defaults to automatic and exposes tuning only after selecting advanced', async () => {
	const onModeChange = vi.fn();
	const onToleranceChange = vi.fn();
	const { rerender } = render(Controls, { ...props, onModeChange, onToleranceChange });
	expect(screen.getByRole('button', { name: m.tool_processing_mode_automatic() })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(screen.queryByRole('slider')).not.toBeInTheDocument();
	expect(screen.getByText(m.tool_processing_mode_automatic_help())).toBeInTheDocument();
	await rerender({ ...props, busy: true, onModeChange, onToleranceChange });
	expect(screen.getByRole('progressbar')).toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: m.tool_processing_mode_advanced() }));
	expect(onModeChange).toHaveBeenCalledWith('advanced');
	await rerender({ ...props, mode: 'advanced', onModeChange, onToleranceChange });
	expect(screen.getByRole('slider')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: m.tool_processing_mode_advanced() })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});
import '@testing-library/jest-dom/vitest';
