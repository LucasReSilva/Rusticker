import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Component from './BatchNotifications.svelte';
import type { BatchEntry } from '$lib/state.svelte';
import { m } from '$lib/paraglide/messages';

const requestPermission = vi.fn<() => Promise<NotificationPermission>>();
const NotificationMock = vi.fn(function (this: object) {
	return this;
}) as unknown as typeof Notification & ReturnType<typeof vi.fn>;
Object.defineProperty(NotificationMock, 'permission', { value: 'default', writable: true });
Object.defineProperty(NotificationMock, 'requestPermission', { value: requestPermission });

const entry = (status: BatchEntry['status'], name = 'private-image-name.png'): BatchEntry => ({
	id: 'batch-1',
	file: new File([], name, { type: 'image/png' }),
	status,
	error: null,
	stickers: [],
	trayIconId: null
});

beforeEach(() => {
	requestPermission.mockReset();
	requestPermission.mockResolvedValue('granted');
	vi.stubGlobal('Notification', NotificationMock);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

it('does not request permission until the user explicitly enables notifications', async () => {
	render(Component, { entries: [], running: false });
	expect(requestPermission).not.toHaveBeenCalled();
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	expect(requestPermission).toHaveBeenCalledOnce();
	expect(screen.getByRole('status')).toHaveTextContent(m.batch_notifications_enabled());
});

it('sends one generic browser notification when an enabled batch completes', async () => {
	const view = render(Component, { entries: [entry('processing')], running: true });
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	await view.rerender({ entries: [entry('done')], running: false });
	await waitFor(() => expect(NotificationMock).toHaveBeenCalledOnce());
	const options = NotificationMock.mock.calls[0]?.[1] as NotificationOptions;
	expect(options.body).toBe(m.batch_notification_complete({ count: 1 }));
	expect(options.body).not.toContain('private-image-name.png');
	expect(screen.queryByText(m.batch_notification_complete({ count: 1 }))).toBeNull();
});

it('shows a localized in-app fallback when permission is denied', async () => {
	requestPermission.mockResolvedValue('denied');
	const view = render(Component, { entries: [entry('processing')], running: true });
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	expect(screen.getByText(m.batch_notifications_denied())).toBeTruthy();
	await view.rerender({ entries: [entry('done')], running: false });
	await waitFor(() =>
		expect(screen.getByText(m.batch_notification_complete({ count: 1 }))).toBeTruthy()
	);
	expect(NotificationMock).not.toHaveBeenCalled();
});

it('uses the in-app fallback when Notification is unsupported and allows disabling', async () => {
	vi.stubGlobal('Notification', undefined);
	const view = render(Component, { entries: [entry('processing')], running: true });
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	expect(screen.getByText(m.batch_notifications_unsupported())).toBeTruthy();
	await view.rerender({ entries: [entry('done')], running: false });
	await waitFor(() =>
		expect(screen.getByText(m.batch_notification_complete({ count: 1 }))).toBeTruthy()
	);
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_dismiss() }));
	expect(screen.queryByText(m.batch_notification_complete({ count: 1 }))).toBeNull();
});

it('stops browser notifications after the user disables them', async () => {
	const view = render(Component, { entries: [entry('processing')], running: true });
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_enable() }));
	await fireEvent.click(screen.getByRole('button', { name: m.batch_notifications_disable() }));
	await view.rerender({ entries: [entry('done')], running: false });
	await waitFor(() =>
		expect(screen.getByText(m.batch_notification_complete({ count: 1 }))).toBeTruthy()
	);
	expect(NotificationMock).not.toHaveBeenCalled();
});

it('does not emit a completion notice when every image failed', async () => {
	const view = render(Component, { entries: [entry('processing')], running: true });
	await view.rerender({ entries: [entry('error')], running: false });
	await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
	expect(NotificationMock).not.toHaveBeenCalled();
});
