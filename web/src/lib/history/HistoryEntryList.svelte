<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { ProcessingHistoryEntry } from './store';

	let { entries, onDelete }: { entries: ProcessingHistoryEntry[]; onDelete: (id: string) => void } =
		$props();
	const intlLocale = $derived(locale.current === 'pt-BR' ? 'pt-BR' : locale.current);

	function dateLabel(timestamp: number): string {
		return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(timestamp)
		);
	}

	function colorLabel(color: ProcessingHistoryEntry['background']): string {
		return m.history_color({ red: color.r, green: color.g, blue: color.b });
	}
</script>

<ul class="flex flex-col gap-3">
	{#each entries as entry (entry.id)}
		<li>
			<Card.Root>
				<Card.Content class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex flex-col gap-1">
						<p class="font-medium">{m.history_completed_at({ date: dateLabel(entry.completedAt) })}</p>
						<p class="text-sm text-muted-foreground">
							{m.history_dimensions({ width: entry.width, height: entry.height })}
						</p>
						<p class="text-sm text-muted-foreground">
							{m.history_options({ color: colorLabel(entry.background), tolerance: entry.tolerance })}
						</p>
						<p class="text-sm text-muted-foreground">
							{m.history_sticker_count({ count: entry.stickerCount })}
						</p>
						{#if entry.previouslyProcessed}
							<p class="text-sm font-medium text-primary">{m.history_duplicate_notice()}</p>
						{/if}
					</div>
					<Button.Root
						variant="ghost"
						size="sm"
						aria-label={m.history_delete_entry({ date: dateLabel(entry.completedAt) })}
						onclick={() => onDelete(entry.id)}
					>
						{m.history_delete_action()}
					</Button.Root>
				</Card.Content>
			</Card.Root>
		</li>
	{/each}
</ul>
