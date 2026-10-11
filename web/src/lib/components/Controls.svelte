<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Slider } from '$lib/components/ui/slider';
	import { Progress } from '$lib/components/ui/progress';
	import { formatPercent } from '$lib/format';
	import { toHex } from '$lib/tool/eyedropper';
	import type { Rgb } from '$lib/detection';
	import { m } from '$lib/paraglide/messages';
	let {
		tolerance,
		background,
		busy,
		hasImage,
		onToleranceChange
	}: {
		tolerance: number;
		background: Rgb;
		busy: boolean;
		hasImage: boolean;
		onToleranceChange: (value: number) => void;
	} = $props();
	const id = $props.id();
	const percent = $derived(formatPercent(tolerance / 100));
	let slider = $state<HTMLElement | null>(null);
	// The design-system Slider exposes its root ref; its thumb owns the ARIA value.
	$effect(() => {
		const thumb = slider?.querySelector('[role="slider"]');
		thumb?.setAttribute('aria-valuetext', percent);
		thumb?.setAttribute('aria-describedby', `${id}-help`);
	});
</script>

<Card.Root class="gap-4 p-4">
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<label for={id} class="font-medium">{m.tool_tolerance_label()}</label><output for={id}
				>{percent}</output
			>
		</div>
		<Slider
			bind:ref={slider}
			type="single"
			{id}
			value={tolerance}
			min={0}
			max={100}
			step={1}
			disabled={!hasImage}
			thumbLabel={m.tool_tolerance_label()}
			aria-valuetext={percent}
			aria-describedby="{id}-help"
			onValueChange={(value) => onToleranceChange(value)}
		/>
		<p id="{id}-help" class="text-sm text-muted-foreground">{m.tool_tolerance_help()}</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<span class="font-medium">{m.tool_background_label()}</span>
		<!-- User-selected image data: the documented swatch token exception. -->
		<span
			class="size-6 rounded-md border border-input bg-(--swatch)"
			style="--swatch: rgb({background.r} {background.g} {background.b})"
			aria-hidden="true"
		></span>
		<code class="font-mono text-sm" data-background-color>{toHex(background)}</code>
	</div>
	{#if busy}<Progress
			value={null}
			aria-label={m.tool_processing_label()}
			class="motion-safe:animate-pulse [&>[data-slot=progress-indicator]]:transform-none!"
		/>{/if}
</Card.Root>
