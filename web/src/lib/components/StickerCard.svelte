<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import type { Sticker } from '$lib/detection';
	import type { StickerSizeInfo } from '$lib/tool/size';
	import { formatKilobytes, formatNumber } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	let {
		sticker,
		position,
		total,
		isTrayIcon,
		canMoveEarlier,
		canMoveLater,
		sizeOf,
		active,
		onRemoveRequest,
		onSetTrayIcon,
		onMoveEarlier,
		onMoveLater,
		onFocus,
		splitPreview,
		splitBusy,
		noSplitProposal,
		undoable,
		allowSplitRequest = true,
		onSplitRequest,
		onSplitAccept,
		onSplitDiscard,
		onSplitUndo
	}: {
		sticker: Sticker;
		position: number;
		total: number;
		isTrayIcon: boolean;
		canMoveEarlier: boolean;
		canMoveLater: boolean;
		sizeOf?: (id: string) => StickerSizeInfo | undefined;
		active: boolean;
		onRemoveRequest: () => void;
		onSetTrayIcon: () => void;
		onMoveEarlier: () => void;
		onMoveLater: () => void;
		onFocus: () => void;
		splitPreview: Sticker[] | null;
		splitBusy: boolean;
		noSplitProposal: boolean;
		undoable: boolean;
		allowSplitRequest?: boolean;
		onSplitRequest: () => void;
		onSplitAccept: () => void;
		onSplitDiscard: () => void;
		onSplitUndo: () => void;
	} = $props();
	let canvas: HTMLCanvasElement;
	const size = $derived(sizeOf?.(sticker.id));
	const formattedPosition = $derived(formatNumber(position));
	$effect(() => {
		canvas.getContext('2d')?.putImageData(sticker.pixels, 0, 0);
	});
	function drawCandidate(node: HTMLCanvasElement, image: ImageData) {
		node.getContext('2d')?.putImageData(image, 0, 0);
	}
</script>

<Card.Root
	data-sticker-card={sticker.id}
	tabindex={active ? 0 : -1}
	aria-label={m.tool_sticker_label({ position: formattedPosition, total: formatNumber(total) })}
	onfocusin={onFocus}
	class="min-w-0 gap-3 p-3 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
>
	<!-- This canvas is a static sticker image, with no interactive fallback. -->
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		bind:this={canvas}
		width={sticker.pixels.width}
		height={sticker.pixels.height}
		role="img"
		aria-label={m.tool_sticker_alt({ position: formattedPosition })}
		class="aspect-square h-auto w-full rounded-md bg-checkerboard"
	></canvas>
	<div class="flex min-h-6 flex-wrap items-center gap-1">
		{#if isTrayIcon}<Badge variant="secondary" class="whitespace-normal"
				>{m.tool_tray_icon_badge()}</Badge
			>{/if}
		{#if size?.status === 'pending'}
			<Badge variant="secondary" aria-label={m.tool_size_pending_label()} data-size-badge
				>{m.tool_size_pending()}</Badge
			>
		{:else if size?.status === 'ready'}
			{@const label = size.overLimit
				? m.tool_size_over_limit_label({ size: formatKilobytes(size.bytes) })
				: m.tool_size_label({ size: formatKilobytes(size.bytes) })}
			<Tooltip.Provider
				><Tooltip.Root
					><Tooltip.Trigger>
						{#snippet child({ props })}<Badge
								{...props}
								tabindex={size.overLimit && active ? 0 : -1}
								variant={size.overLimit ? 'destructive' : 'secondary'}
								aria-label={label}
								data-size-badge>{formatKilobytes(size.bytes)}</Badge
							>{/snippet}
					</Tooltip.Trigger>{#if size.overLimit}<Tooltip.Content>{label}</Tooltip.Content
						>{/if}</Tooltip.Root
				></Tooltip.Provider
			>
		{:else if size?.status === 'error'}<Badge variant="outline" data-size-badge
				>{m.tool_size_unavailable()}</Badge
			>{/if}
	</div>
	<div class="flex flex-wrap justify-end gap-1">
		<Button
			variant="outline"
			size="icon"
			tabindex={active ? 0 : -1}
			disabled={!canMoveEarlier}
			aria-label={m.tool_move_earlier()}
			onclick={onMoveEarlier}><ArrowUp aria-hidden="true" /></Button
		>
		<Button
			variant="outline"
			size="icon"
			tabindex={active ? 0 : -1}
			disabled={!canMoveLater}
			aria-label={m.tool_move_later()}
			onclick={onMoveLater}><ArrowDown aria-hidden="true" /></Button
		>
		{#if allowSplitRequest}<Button
				variant="outline"
				size="sm"
				tabindex={active ? 0 : -1}
				disabled={splitBusy}
				onclick={onSplitRequest}
				>{splitBusy ? m.tool_split_working() : m.tool_split_request()}</Button
			>{/if}
		<Tooltip.Provider
			><Tooltip.Root
				><Tooltip.Trigger>
					{#snippet child({ props })}<Button
							{...props}
							variant="ghost"
							size="icon"
							tabindex={active ? 0 : -1}
							aria-pressed={isTrayIcon}
							aria-label={m.tool_tray_icon_set()}
							onclick={onSetTrayIcon}><Star aria-hidden="true" /></Button
						>{/snippet}
				</Tooltip.Trigger><Tooltip.Content>{m.tool_tray_icon_set()}</Tooltip.Content></Tooltip.Root
			></Tooltip.Provider
		>
		<Tooltip.Provider
			><Tooltip.Root
				><Tooltip.Trigger>
					{#snippet child({ props })}<Button
							{...props}
							data-remove-action
							variant="ghost"
							size="icon"
							tabindex={active ? 0 : -1}
							aria-label={m.tool_remove_label({ position: formattedPosition })}
							onclick={onRemoveRequest}><Trash2 aria-hidden="true" /></Button
						>{/snippet}
				</Tooltip.Trigger><Tooltip.Content
					>{m.tool_remove_label({ position: formattedPosition })}</Tooltip.Content
				></Tooltip.Root
			></Tooltip.Provider
		>
	</div>
	{#if noSplitProposal}<p role="status" class="text-sm text-muted-foreground">
			{m.tool_split_unavailable()}
		</p>{/if}
	{#if splitPreview}
		<div class="flex flex-col gap-2" data-split-preview>
			<p class="text-sm font-medium">{m.tool_split_review()}</p>
			<div class="grid grid-cols-2 gap-2">
				{#each splitPreview as candidate, index (candidate.id)}
					<canvas
						use:drawCandidate={candidate.pixels}
						width={candidate.pixels.width}
						height={candidate.pixels.height}
						role="img"
						aria-label={m.tool_split_candidate({ position: formatNumber(index + 1) })}
						class="aspect-square w-full rounded-md bg-checkerboard"
					></canvas>
				{/each}
			</div>
			<div class="flex flex-wrap justify-end gap-2">
				<Button variant="outline" size="sm" onclick={onSplitDiscard}
					>{m.tool_split_discard()}</Button
				>
				<Button size="sm" onclick={onSplitAccept}>{m.tool_split_accept()}</Button>
			</div>
		</div>
	{/if}
	{#if undoable}<Button variant="outline" size="sm" onclick={onSplitUndo}
			>{m.tool_split_undo()}</Button
		>{/if}
</Card.Root>
