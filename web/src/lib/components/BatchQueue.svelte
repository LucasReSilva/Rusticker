<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import type { BatchEntry } from '$lib/state.svelte';
	let {
		entries,
		activeId,
		running,
		onActivate,
		onRetry,
		onRemove,
		onCancel,
		onClear
	}: {
		entries: BatchEntry[];
		activeId: string | null;
		running: boolean;
		onActivate: (id: string) => void;
		onRetry: (id: string) => void;
		onRemove: (id: string) => void;
		onCancel: () => void;
		onClear: () => void;
	} = $props();
	const statusLabel = (entry: BatchEntry) => {
		if (entry.error === 'BatchLimitExceeded') return m.tool_error_batch_limit();
		return entry.status === 'queued'
			? m.batch_status_queued()
			: entry.status === 'processing'
				? m.batch_status_processing()
				: entry.status === 'done'
					? m.batch_status_done()
					: entry.status === 'cancelled'
						? m.batch_status_cancelled()
						: m.batch_status_error();
	};
</script>

{#if entries.length}
	<Card.Root class="gap-3 p-4" data-testid="batch-queue" aria-busy={running}>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h2 class="font-semibold">{m.batch_heading()}</h2>
				<p class="text-sm text-muted-foreground">{m.batch_help()}</p>
				<p class="text-sm text-muted-foreground">{m.batch_pack_info()}</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if running}
					<Button variant="secondary" size="sm" onclick={onCancel}>{m.batch_cancel()}</Button>
				{/if}
				<Button variant="outline" size="sm" onclick={onClear}>{m.batch_clear()}</Button>
			</div>
		</div>
		<ul class="flex flex-col gap-2">
			{#each entries as entry (entry.id)}
				<li
					class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
					data-batch-status={entry.status}
				>
					<div class="min-w-0">
						<p class="truncate font-medium">{entry.file.name}</p>
						<p
							class="text-sm text-muted-foreground"
							aria-live={entry.status === 'processing' ? 'polite' : 'off'}
						>
							{statusLabel(entry)}
							{#if entry.status === 'done'}
								· {entry.stickers.length}{/if}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#if entry.status === 'done'}
							<Button
								variant="secondary"
								size="sm"
								disabled={running || activeId === entry.id}
								onclick={() => onActivate(entry.id)}
							>
								{m.batch_select()}
							</Button>
						{:else if entry.status === 'error' || entry.status === 'cancelled'}
							<Button
								variant="secondary"
								size="sm"
								disabled={running}
								onclick={() => onRetry(entry.id)}
							>
								{m.batch_retry()}
							</Button>
						{/if}
						<Button
							variant="outline"
							size="sm"
							disabled={entry.status === 'processing'}
							onclick={() => onRemove(entry.id)}
						>
							{m.batch_remove()}
						</Button>
					</div>
				</li>
			{/each}
		</ul>
	</Card.Root>
{/if}
