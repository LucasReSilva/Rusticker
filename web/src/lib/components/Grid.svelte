<script lang="ts">
	import { tick } from 'svelte';
	import StickerCard from './StickerCard.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Sticker } from '$lib/detection';
	import type { StickerSizeInfo } from '$lib/tool/size';
	import { nextIndex } from '$lib/tool/grid-nav';
	import { formatNumber } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	let {
		stickers,
		trayIconId,
		sizeOf,
		busy,
		pending,
		onRemove,
		onSetTrayIcon,
		splitPreview = null,
		splitBusyId = null,
		noSplitProposalId = null,
		undoableStickerIds = new Set<string>(),
		allowSplitRequest = true,
		onSplitRequest = () => {},
		onSplitAccept = () => {},
		onSplitDiscard = () => {},
		onSplitUndo = () => {}
	}: {
		stickers: Sticker[];
		trayIconId: string | null;
		sizeOf?: (id: string) => StickerSizeInfo | undefined;
		busy: boolean;
		pending: boolean;
		onRemove: (id: string) => void;
		onSetTrayIcon: (id: string) => void;
		splitPreview?: { source: Sticker; candidates: Sticker[] } | null;
		splitBusyId?: string | null;
		noSplitProposalId?: string | null;
		undoableStickerIds?: ReadonlySet<string>;
		allowSplitRequest?: boolean;
		onSplitRequest?: (id: string) => void;
		onSplitAccept?: () => void;
		onSplitDiscard?: () => void;
		onSplitUndo?: (id: string) => void;
	} = $props();
	let activeId = $state<string | null>(null);
	const activeIndex = $derived(
		Math.max(
			0,
			stickers.findIndex((sticker) => sticker.id === activeId)
		)
	);
	let list: HTMLUListElement;
	let heading: HTMLHeadingElement;
	let dialogOpen = $state(false);
	let removeId = $state<string | null>(null);
	let removePosition = $state(0);
	let confirmed = false;
	const headingId = $props.id();
	function cards(): HTMLElement[] {
		return Array.from(list?.querySelectorAll<HTMLElement>('[data-sticker-card]') ?? []);
	}
	function focus(index: number) {
		activeId = stickers[index]?.id ?? null;
		cards()[index]?.focus();
	}
	function requestRemove(index: number) {
		removeId = stickers[index].id;
		removePosition = index + 1;
		confirmed = false;
		dialogOpen = true;
	}
	function keydown(event: KeyboardEvent) {
		const target = (event.target as HTMLElement).closest<HTMLElement>('[data-sticker-card]');
		if (!target || dialogOpen) return;
		const elements = cards();
		const index = elements.indexOf(target);
		if (['Delete', 'Backspace'].includes(event.key)) {
			event.preventDefault();
			requestRemove(index);
			return;
		}
		if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
			return;
		event.preventDefault();
		// Distinct horizontal positions prevent jsdom's zero-layout fallback counting every card.
		const columns = new Set(
			elements
				.filter((card) => card.offsetTop === elements[0].offsetTop)
				.map((card) => card.offsetLeft)
		).size;
		focus(
			nextIndex(
				index,
				event.key,
				stickers.length,
				columns,
				getComputedStyle(list).direction === 'rtl'
			)
		);
	}
	function confirm() {
		if (removeId) onRemove(removeId);
		confirmed = true;
		dialogOpen = false;
	}
	async function restoreFocus(event: Event) {
		event.preventDefault();
		await tick();
		if (confirmed) {
			if (stickers.length) focus(Math.min(removePosition - 1, stickers.length - 1));
			else {
				activeId = null;
				heading.focus();
			}
		} else {
			const index = stickers.findIndex((sticker) => sticker.id === removeId);
			cards()[index]?.querySelector<HTMLButtonElement>('[data-remove-action]')?.focus();
		}
	}
</script>

<section aria-busy={busy} class="flex min-w-0 flex-col gap-4">
	<h2
		id={headingId}
		bind:this={heading}
		tabindex="-1"
		class="font-display text-xl font-semibold focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
	>
		{m.tool_grid_heading()}
	</h2>
	<!-- Keyboard handlers implement roving focus over this non-tabular list. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<ul
		bind:this={list}
		aria-labelledby={headingId}
		class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
		onkeydown={keydown}
	>
		{#if pending}
			{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}<li aria-hidden="true">
					<Skeleton
						class="aspect-square w-full rounded-lg motion-safe:animate-pulse motion-reduce:animate-none"
					/>
				</li>{/each}
		{:else}
			{#each stickers as sticker, index (sticker.id)}<li class="min-w-0">
					<StickerCard
						{sticker}
						position={index + 1}
						total={stickers.length}
						isTrayIcon={trayIconId === sticker.id}
						{sizeOf}
						active={index === activeIndex}
						onFocus={() => (activeId = sticker.id)}
						onRemoveRequest={() => requestRemove(index)}
						onSetTrayIcon={() => onSetTrayIcon(sticker.id)}
						splitPreview={splitPreview?.source.id === sticker.id ? splitPreview.candidates : null}
						splitBusy={splitBusyId === sticker.id}
						noSplitProposal={noSplitProposalId === sticker.id}
						undoable={undoableStickerIds.has(sticker.id)}
						{allowSplitRequest}
						onSplitRequest={() => onSplitRequest(sticker.id)}
						{onSplitAccept}
						{onSplitDiscard}
						onSplitUndo={() => onSplitUndo(sticker.id)}
					/>
				</li>{/each}
		{/if}
	</ul>
	{#if !pending && !stickers.length}<p class="text-muted-foreground">{m.tool_grid_empty()}</p>{/if}
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content onCloseAutoFocus={restoreFocus}>
			<Dialog.Header
				><Dialog.Title
					>{m.tool_remove_title({ position: formatNumber(removePosition) })}</Dialog.Title
				><Dialog.Description>{m.tool_remove_description()}</Dialog.Description></Dialog.Header
			>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (dialogOpen = false)}
					>{m.tool_remove_cancel()}</Button
				>
				<Button variant="destructive" onclick={confirm}>{m.tool_remove_confirm()}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</section>
