<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';
	import type { BatchEntry } from '$lib/state.svelte';

	let { entries, running }: { entries: BatchEntry[]; running: boolean } = $props();
	let enabled = $state(false);
	let permissionState = $state<'idle' | 'enabled' | 'denied' | 'unsupported'>('idle');
	let completedCount = $state<number | null>(null);
	let wasRunning = false;

	async function enableNotifications(): Promise<void> {
		if (
			typeof Notification === 'undefined' ||
			typeof Notification.requestPermission !== 'function'
		) {
			permissionState = 'unsupported';
			enabled = false;
			return;
		}

		try {
			const permission =
				Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
			if (permission === 'granted') {
				permissionState = 'enabled';
				enabled = true;
			} else {
				permissionState = 'denied';
				enabled = false;
			}
		} catch {
			permissionState = 'unsupported';
			enabled = false;
		}
	}

	function disableNotifications(): void {
		enabled = false;
		permissionState = 'idle';
	}

	$effect(() => {
		const isRunning = running;
		const batch = entries;
		if (isRunning) {
			wasRunning = true;
			completedCount = null;
			return;
		}
		if (!wasRunning) return;
		wasRunning = false;
		const count = batch.filter((entry) => entry.status === 'done').length;
		if (!count) return;
		completedCount = count;
		if (!enabled) return;
		try {
			new Notification(m.batch_notification_title(), {
				body: m.batch_notification_complete({ count })
			});
			completedCount = null;
		} catch {
			enabled = false;
			permissionState = 'unsupported';
		}
	});
</script>

<section class="flex flex-wrap items-center gap-2" data-testid="batch-notifications">
	{#if enabled}
		<p class="text-sm text-muted-foreground" role="status">{m.batch_notifications_enabled()}</p>
		<Button variant="outline" size="sm" onclick={disableNotifications}>
			{m.batch_notifications_disable()}
		</Button>
	{:else}
		<Button variant="outline" size="sm" onclick={enableNotifications}>
			{m.batch_notifications_enable()}
		</Button>
	{/if}
	{#if permissionState === 'denied'}
		<p class="text-sm text-muted-foreground" role="status">
			{m.batch_notifications_denied()}
		</p>
	{:else if permissionState === 'unsupported'}
		<p class="text-sm text-muted-foreground" role="status">
			{m.batch_notifications_unsupported()}
		</p>
	{/if}
	{#if completedCount !== null}
		<div class="basis-full" role="status" aria-live="polite">
			<p class="text-sm">{m.batch_notification_complete({ count: completedCount })}</p>
			<Button variant="ghost" size="sm" onclick={() => (completedCount = null)}>
				{m.batch_notifications_dismiss()}
			</Button>
		</div>
	{/if}
</section>
