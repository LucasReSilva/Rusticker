<script lang="ts">
	import { tick } from 'svelte';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { formatNumber } from '$lib/format';
	import { adjustStickerBounds } from '$lib/tool/bounds';
	import {
		editCropBounds,
		nextZoom,
		sourceDelta,
		ZOOM_LEVELS,
		type CropHandle
	} from '$lib/tool/inspector';
	import { STICKER_SIZE, type BBox, type Sticker } from '$lib/detection';
	import { m } from '$lib/paraglide/messages';

	let {
		sticker,
		sourceUrl = '',
		sourceWidth,
		sourceHeight,
		onApply,
		onCancel
	}: {
		sticker: Sticker;
		sourceUrl?: string;
		sourceWidth: number;
		sourceHeight: number;
		onApply: (sticker: Sticker) => void;
		onCancel: () => void;
	} = $props();
	const id = $props.id();
	let draft = $derived({ ...sticker.bbox });
	let preview = $state<HTMLCanvasElement | undefined>(undefined);
	let viewport = $state<HTMLDivElement | undefined>(undefined);
	let frame = $state<HTMLDivElement | undefined>(undefined);
	let zoom = $state<number>(1);
	let drag: { handle: CropHandle; x: number; y: number; bounds: BBox } | null = null;
	let panDrag: { x: number; y: number; left: number; top: number } | null = null;
	const panHelpId = `${id}-pan`;
	const editHelpId = `${id}-edit`;
	const adjusted = $derived(adjustStickerBounds(sticker, draft, sourceWidth, sourceHeight));
	const unchanged = $derived(
		draft.x === sticker.bbox.x &&
			draft.y === sticker.bbox.y &&
			draft.width === sticker.bbox.width &&
			draft.height === sticker.bbox.height
	);
	const sourceIsValid = $derived(
		Number.isSafeInteger(sourceWidth) &&
			Number.isSafeInteger(sourceHeight) &&
			sourceWidth > 0 &&
			sourceHeight > 0
	);
	const controls = $derived([
		{
			key: 'x' as const,
			label: m.tool_bounds_x(),
			value: draft.x,
			max: Math.max(0, sourceWidth - draft.width)
		},
		{
			key: 'y' as const,
			label: m.tool_bounds_y(),
			value: draft.y,
			max: Math.max(0, sourceHeight - draft.height)
		},
		{
			key: 'width' as const,
			label: m.tool_bounds_width(),
			value: draft.width,
			max: Math.max(1, sourceWidth - draft.x)
		},
		{
			key: 'height' as const,
			label: m.tool_bounds_height(),
			value: draft.height,
			max: Math.max(1, sourceHeight - draft.y)
		}
	]);

	$effect(() => {
		const result = adjusted;
		if (result) preview?.getContext('2d')?.putImageData(result.pixels, 0, 0);
	});

	function update(key: keyof BBox, values: number[]) {
		const value = Math.round(values[0] ?? draft[key]);
		const max =
			key === 'x'
				? sourceWidth - draft.width
				: key === 'y'
					? sourceHeight - draft.height
					: key === 'width'
						? sourceWidth - draft.x
						: sourceHeight - draft.y;
		draft = { ...draft, [key]: Math.max(key === 'x' || key === 'y' ? 0 : 1, Math.min(max, value)) };
	}

	function reset() {
		draft = { ...sticker.bbox };
	}
	async function changeZoom(value: number) {
		const x = viewport
			? (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth
			: 0.5;
		const y = viewport
			? (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight
			: 0.5;
		zoom = value;
		await tick();
		if (viewport) {
			viewport.scrollLeft = x * viewport.scrollWidth - viewport.clientWidth / 2;
			viewport.scrollTop = y * viewport.scrollHeight - viewport.clientHeight / 2;
		}
	}
	function panKeys(event: KeyboardEvent) {
		if (!viewport || event.target !== viewport || !event.key.startsWith('Arrow')) return;
		event.preventDefault();
		const step = event.shiftKey ? viewport.clientWidth / 2 : viewport.clientWidth / 4;
		if (event.key === 'ArrowLeft') viewport.scrollLeft -= step;
		if (event.key === 'ArrowRight') viewport.scrollLeft += step;
		if (event.key === 'ArrowUp') viewport.scrollTop -= step;
		if (event.key === 'ArrowDown') viewport.scrollTop += step;
	}
	function keyboardPan(node: HTMLDivElement) {
		function start(event: PointerEvent) {
			if (event.pointerType === 'touch' || event.button !== 0) return;
			if (event.target instanceof Element && event.target.closest('[data-crop-box]')) return;
			panDrag = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
			node.setPointerCapture(event.pointerId);
		}
		function move(event: PointerEvent) {
			if (!panDrag) return;
			node.scrollLeft = panDrag.left + panDrag.x - event.clientX;
			node.scrollTop = panDrag.top + panDrag.y - event.clientY;
		}
		function stop() {
			panDrag = null;
		}
		node.addEventListener('keydown', panKeys);
		node.addEventListener('pointerdown', start);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', stop);
		node.addEventListener('pointercancel', stop);
		return {
			destroy: () => {
				node.removeEventListener('keydown', panKeys);
				node.removeEventListener('pointerdown', start);
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerup', stop);
				node.removeEventListener('pointercancel', stop);
			}
		};
	}
	function startDrag(event: PointerEvent, handle: CropHandle) {
		event.preventDefault();
		event.stopPropagation();
		drag = { handle, x: event.clientX, y: event.clientY, bounds: { ...draft } };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function dragMove(event: PointerEvent) {
		if (!drag || !frame) return;
		const size = frame.getBoundingClientRect();
		draft = editCropBounds(
			drag.bounds,
			drag.handle,
			sourceDelta(event.clientX - drag.x, size.width, sourceWidth),
			sourceDelta(event.clientY - drag.y, size.height, sourceHeight),
			sourceWidth,
			sourceHeight
		);
	}
	function endDrag() {
		drag = null;
	}
	function editKeys(event: KeyboardEvent, handle: CropHandle) {
		if (!event.key.startsWith('Arrow')) return;
		event.preventDefault();
		const step = event.shiftKey ? 10 : 1;
		const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
		const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
		draft = editCropBounds(draft, handle, dx, dy, sourceWidth, sourceHeight);
	}
</script>

<Card.Root class="gap-4 p-4" data-bounds-editor>
	<div class="flex flex-col gap-1">
		<h3 class="font-medium">{m.tool_bounds_title()}</h3>
		<p class="text-sm text-muted-foreground">{m.tool_bounds_help()}</p>
	</div>
	{#if sourceUrl && sourceIsValid}
		<div class="flex flex-wrap items-center justify-end gap-1">
			<Button
				variant="outline"
				size="icon"
				aria-label={m.tool_inspector_zoom_out()}
				disabled={zoom === ZOOM_LEVELS[0]}
				onclick={() => changeZoom(nextZoom(zoom, -1))}><ZoomOut aria-hidden="true" /></Button
			>
			<output class="min-w-12 text-center text-sm tabular-nums">{formatNumber(zoom * 100)}%</output>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.tool_inspector_zoom_in()}
				disabled={zoom === ZOOM_LEVELS.at(-1)}
				onclick={() => changeZoom(nextZoom(zoom, 1))}><ZoomIn aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.tool_inspector_zoom_reset()}
				disabled={zoom === 1}
				onclick={() => changeZoom(1)}><RotateCcw aria-hidden="true" /></Button
			>
		</div>
		<!-- This scrollable image region needs keyboard focus for arrow-key panning. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			bind:this={viewport}
			use:keyboardPan
			data-crop-inspector
			data-zoom={zoom}
			role="region"
			tabindex="0"
			aria-label={m.tool_inspector_area()}
			aria-describedby={panHelpId}
			class="max-h-96 overflow-auto rounded-lg border border-border bg-checkerboard focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
		>
			<div bind:this={frame} dir="ltr" class="relative min-w-full" style:width={`${zoom * 100}%`}>
				<img
					src={sourceUrl}
					width={sourceWidth}
					height={sourceHeight}
					alt={m.tool_bounds_source_alt()}
					class="block h-auto w-full"
				/>
				<div
					data-crop-box
					data-x={draft.x}
					data-y={draft.y}
					data-width={draft.width}
					data-height={draft.height}
					class="absolute border-2 border-primary bg-primary/10"
					style:inset-inline-start={`${(draft.x / sourceWidth) * 100}%`}
					style:inset-block-start={`${(draft.y / sourceHeight) * 100}%`}
					style:width={`${(draft.width / sourceWidth) * 100}%`}
					style:height={`${(draft.height / sourceHeight) * 100}%`}
				>
					<Button
						variant="ghost"
						aria-label={m.tool_bounds_move()}
						aria-describedby={editHelpId}
						class="absolute inset-0 size-full cursor-move touch-none"
						onpointerdown={(event) => startDrag(event, 'move')}
						onpointermove={dragMove}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						onkeydown={(event) => editKeys(event, 'move')}
					/>
					<Button
						variant="secondary"
						size="icon"
						aria-label={m.tool_bounds_resize_nw()}
						aria-describedby={editHelpId}
						class="absolute -start-3 -top-3 size-6 cursor-nwse-resize touch-none"
						onpointerdown={(event) => startDrag(event, 'nw')}
						onpointermove={dragMove}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						onkeydown={(event) => editKeys(event, 'nw')}
					/>
					<Button
						variant="secondary"
						size="icon"
						aria-label={m.tool_bounds_resize_ne()}
						aria-describedby={editHelpId}
						class="absolute -end-3 -top-3 size-6 cursor-nesw-resize touch-none"
						onpointerdown={(event) => startDrag(event, 'ne')}
						onpointermove={dragMove}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						onkeydown={(event) => editKeys(event, 'ne')}
					/>
					<Button
						variant="secondary"
						size="icon"
						aria-label={m.tool_bounds_resize_sw()}
						aria-describedby={editHelpId}
						class="absolute -start-3 -bottom-3 size-6 cursor-nesw-resize touch-none"
						onpointerdown={(event) => startDrag(event, 'sw')}
						onpointermove={dragMove}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						onkeydown={(event) => editKeys(event, 'sw')}
					/>
					<Button
						variant="secondary"
						size="icon"
						aria-label={m.tool_bounds_resize_se()}
						aria-describedby={editHelpId}
						class="absolute -end-3 -bottom-3 size-6 cursor-nwse-resize touch-none"
						onpointerdown={(event) => startDrag(event, 'se')}
						onpointermove={dragMove}
						onpointerup={endDrag}
						onpointercancel={endDrag}
						onkeydown={(event) => editKeys(event, 'se')}
					/>
				</div>
			</div>
		</div>
		<p id={panHelpId} class="sr-only">{m.tool_inspector_help()}</p>
		<p id={editHelpId} class="text-sm text-muted-foreground">{m.tool_bounds_keyboard_help()}</p>
	{/if}
	<div class="grid min-w-0 gap-4 sm:grid-cols-2">
		{#each controls as control (control.key)}
			{@const controlId = `${id}-${control.key}`}
			<div class="flex min-w-0 flex-col gap-2">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<label for={controlId} class="font-medium">{control.label}</label>
					<output for={controlId}>{formatNumber(control.value)}</output>
				</div>
				<Slider
					{...{ id: controlId }}
					type="single"
					value={control.value}
					min={control.key === 'x' || control.key === 'y' ? 0 : 1}
					max={control.max}
					step={1}
					disabled={!sourceIsValid}
					thumbLabel={control.label}
					aria-valuetext={formatNumber(control.value)}
					onValueChange={(value) => update(control.key, [value])}
				/>
			</div>
		{/each}
	</div>
	{#if adjusted}
		<div class="flex flex-col gap-2">
			<p class="font-medium">{m.tool_bounds_preview_label()}</p>
			<!-- This canvas is a static preview of the adjusted transparent sticker. -->
			<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
			<canvas
				bind:this={preview}
				width={STICKER_SIZE}
				height={STICKER_SIZE}
				role="img"
				aria-label={m.tool_bounds_preview_alt()}
				class="aspect-square h-auto w-full rounded-md bg-checkerboard"
			></canvas>
		</div>
	{:else}
		<p role="status" class="text-sm text-destructive">{m.tool_bounds_invalid()}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2">
		<Button variant="outline" onclick={reset}>{m.tool_bounds_reset()}</Button>
		<Button variant="outline" onclick={onCancel}>{m.tool_remove_cancel()}</Button>
		<Button disabled={!adjusted || unchanged} onclick={() => adjusted && onApply(adjusted)}
			>{m.tool_bounds_apply()}</Button
		>
	</div>
</Card.Root>
