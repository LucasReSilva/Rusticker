<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import * as Button from '$lib/components/ui/button';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import HistoryEntryList from '$lib/history/HistoryEntryList.svelte';
	import {
		clearProcessingHistory,
		deleteProcessingHistoryEntry,
		disableProcessingHistory,
		enableProcessingHistory,
		listProcessingHistory,
		processingHistoryEnabled,
		type ProcessingHistoryEntry
	} from '$lib/history/store';

	let entries = $state<ProcessingHistoryEntry[]>([]);
	let enabled = $state(false);
	let loading = $state(true);
	let unavailable = $state(false);
	let disablePrompt = $state(false);
	let clearDialogOpen = $state(false);
	let pendingAction = $state(false);

	async function refresh(): Promise<void> {
		loading = true;
		const result = await listProcessingHistory();
		if (result.ok) {
			entries = result.value;
			unavailable = false;
		} else {
			unavailable = true;
		}
		loading = false;
	}

	async function enable(): Promise<void> {
		pendingAction = true;
		enabled = await enableProcessingHistory();
		unavailable = !enabled;
		pendingAction = false;
		if (enabled) await refresh();
	}

	function beginDisable(): void {
		disablePrompt = true;
	}

	function disableAndKeep(): void {
		disableProcessingHistory();
		enabled = false;
		disablePrompt = false;
	}

	async function disableAndClear(): Promise<void> {
		pendingAction = true;
		if (await clearProcessingHistory()) {
			disableProcessingHistory();
			enabled = false;
			entries = [];
			disablePrompt = false;
			unavailable = false;
		} else {
			unavailable = true;
		}
		pendingAction = false;
	}

	async function removeEntry(id: string): Promise<void> {
		if (await deleteProcessingHistoryEntry(id)) await refresh();
		else unavailable = true;
	}

	async function clearAll(): Promise<void> {
		pendingAction = true;
		if (await clearProcessingHistory()) {
			entries = [];
			unavailable = false;
			clearDialogOpen = false;
		} else {
			unavailable = true;
		}
		pendingAction = false;
	}

	onMount(() => {
		enabled = processingHistoryEnabled();
		void refresh();
	});
</script>

<svelte:head>
	<title>{m.meta_history_title()}</title>
	<meta name="description" content={m.meta_history_description()} />
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
	<h1 class="font-display text-3xl font-bold">{m.history_page_heading()}</h1>

	{#if unavailable}
		<p role="status" class="rounded-md border border-border bg-muted p-4 text-sm">
			{m.history_storage_unavailable()}
		</p>
	{/if}

	{#if !enabled}
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.history_enable_heading()}</Card.Title>
				<Card.Description>{m.history_privacy_explanation()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">{m.history_no_images_retained()}</p>
				<p class="mt-2 text-sm text-muted-foreground">{m.history_reselect_notice()}</p>
			</Card.Content>
			<Card.Footer>
				<Button.Root disabled={pendingAction} onclick={() => void enable()}>
					{m.history_enable_action()}
				</Button.Root>
			</Card.Footer>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.history_enabled_heading()}</Card.Title>
				<Card.Description>{m.history_privacy_explanation()}</Card.Description>
			</Card.Header>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button.Root variant="outline" onclick={beginDisable}
					>{m.history_disable_action()}</Button.Root
				>
			</Card.Footer>
		</Card.Root>

		{#if disablePrompt}
			<section
				class="flex flex-col gap-3 rounded-md border border-border bg-muted p-4"
				aria-live="polite"
			>
				<p>{m.history_disable_prompt()}</p>
				<div class="flex flex-wrap gap-2">
					<Button.Root variant="outline" onclick={disableAndKeep}>
						{m.history_disable_keep_action()}
					</Button.Root>
					<Button.Root
						variant="destructive"
						disabled={pendingAction}
						onclick={() => void disableAndClear()}
					>
						{m.history_disable_clear_action()}
					</Button.Root>
				</div>
			</section>
		{/if}
	{/if}

	{#if loading}
		<p role="status">{m.history_loading()}</p>
	{:else if entries.length === 0}
		{#if enabled}
			<Card.Root>
				<Card.Content class="py-8 text-center text-muted-foreground">
					<p>{m.history_empty()}</p>
				</Card.Content>
			</Card.Root>
		{/if}
	{:else}
		<div class="flex flex-col gap-3">
			{#if !enabled}
				<p class="text-sm text-muted-foreground">{m.history_reselect_notice()}</p>
			{/if}
			<HistoryEntryList {entries} onDelete={(id) => void removeEntry(id)} />
			<Dialog.Root bind:open={clearDialogOpen}>
				<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
					{m.history_clear_action()}
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>{m.history_clear_confirm_title()}</Dialog.Title>
						<Dialog.Description>{m.history_clear_confirm_body()}</Dialog.Description>
					</Dialog.Header>
					<Dialog.Footer>
						<Button.Root variant="outline" onclick={() => (clearDialogOpen = false)}>
							{m.history_cancel_action()}
						</Button.Root>
						<Button.Root
							variant="destructive"
							disabled={pendingAction}
							onclick={() => void clearAll()}
						>
							{m.history_confirm_clear_action()}
						</Button.Root>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	{/if}
</div>
