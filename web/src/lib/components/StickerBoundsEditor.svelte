<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { formatNumber } from '$lib/format';
	import { adjustStickerBounds } from '$lib/tool/bounds';
	import { STICKER_SIZE, type BBox, type Sticker } from '$lib/detection';
	import { m } from '$lib/paraglide/messages';

	let {
		sticker,
		sourceWidth,
		sourceHeight,
		onApply,
		onCancel
	}: {
		sticker: Sticker;
		sourceWidth: number;
		sourceHeight: number;
		onApply: (sticker: Sticker) => void;
		onCancel: () => void;
	} = $props();
	const id = $props.id();
	let draft = $derived({ ...sticker.bbox });
	let preview = $state<HTMLCanvasElement | undefined>(undefined);
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
</script>

<Card.Root class="gap-4 p-4" data-bounds-editor>
	<div class="flex flex-col gap-1">
		<h3 class="font-medium">{m.tool_bounds_title()}</h3>
		<p class="text-sm text-muted-foreground">{m.tool_bounds_help()}</p>
	</div>
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
