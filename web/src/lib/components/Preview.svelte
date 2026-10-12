<script lang="ts">
	import { tick } from 'svelte';
	import Pipette from '@lucide/svelte/icons/pipette';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { BBox, Rgb } from '$lib/detection';
	import { moveCrosshair, sampleColor, toHex, type Point } from '$lib/tool/eyedropper';
	import { m } from '$lib/paraglide/messages';
	let {
		src,
		width,
		height,
		imageData,
		boxes,
		background,
		busy,
		advanced = false,
		onPick
	}: {
		src: string;
		width: number;
		height: number;
		imageData: ImageData;
		boxes: BBox[];
		background: Rgb;
		busy: boolean;
		advanced?: boolean;
		onPick: (color: Rgb) => void;
	} = $props();
	const hintId = $props.id();
	let active = $state(false);
	let position = $state<Point>({ x: 0, y: 0 });
	let announcement = $state('');
	let overlay: SVGSVGElement;
	let toggle = $state<HTMLButtonElement | null>(null);
	async function activate() {
		active = !active;
		if (active) {
			position = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
			await tick();
			overlay.focus();
		}
	}
	function cancel() {
		active = false;
		toggle?.focus();
	}
	function pick(point: Point) {
		const color = sampleColor(imageData, point.x, point.y);
		onPick(color);
		announcement = m.tool_eyedropper_picked({ color: toHex(color) });
		cancel();
	}
	function keydown(event: KeyboardEvent) {
		if (!active) return;
		if (event.key.startsWith('Arrow')) {
			event.preventDefault();
			position = moveCrosshair(position, event.key, event.shiftKey, { width, height });
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			pick(position);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	}
	function pointer(event: PointerEvent) {
		if (!active) return;
		const bounds = overlay.getBoundingClientRect();
		pick({
			x: ((event.clientX - bounds.x) * width) / bounds.width,
			y: ((event.clientY - bounds.y) * height) / bounds.height
		});
	}
</script>

<section aria-busy={busy} class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="font-display text-xl font-semibold">{m.tool_preview_heading()}</h2>
		{#if advanced}<Tooltip.Provider
				><Tooltip.Root
					><Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								bind:ref={toggle}
								variant="outline"
								size="icon"
								aria-label={m.tool_eyedropper_label()}
								aria-pressed={active}
								disabled={busy}
								onclick={activate}><Pipette aria-hidden="true" /></Button
							>
						{/snippet}
					</Tooltip.Trigger><Tooltip.Content>{m.tool_eyedropper_tooltip()}</Tooltip.Content
					></Tooltip.Root
				></Tooltip.Provider
			>{/if}
	</div>
	<div class="relative overflow-hidden rounded-lg border border-border bg-checkerboard">
		<img {src} {width} {height} alt={m.tool_preview_alt()} class="h-auto w-full" />
		<!-- The application role exists only while the keyboard color picker is active. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<svg
			bind:this={overlay}
			viewBox="0 0 {width} {height}"
			class="absolute inset-0 size-full focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
			class:cursor-crosshair={active}
			role={active ? 'application' : undefined}
			tabindex={active ? 0 : undefined}
			aria-hidden={!active}
			aria-label={active ? m.tool_eyedropper_area_label() : undefined}
			aria-describedby={active ? hintId : undefined}
			onkeydown={keydown}
			onpointerdown={pointer}
		>
			{#each boxes as box, index (index)}<rect
					x={box.x}
					y={box.y}
					width={box.width}
					height={box.height}
					vector-effect="non-scaling-stroke"
					class="fill-none stroke-primary stroke-2"
					data-detection-box
				/>{/each}
			{#if active}
				<path
					d="M {position.x} 0 V {height} M 0 {position.y} H {width}"
					vector-effect="non-scaling-stroke"
					class="stroke-foreground stroke-2"
					data-crosshair
					data-x={position.x}
					data-y={position.y}
				/>
			{/if}
		</svg>
	</div>
	<p id={hintId} class={active ? 'text-sm text-muted-foreground' : 'sr-only'}>
		{m.tool_eyedropper_keyboard_hint()}
	</p>
	<p class="sr-only" aria-live="polite">{announcement}</p>
	<span class="sr-only">{toHex(background)}</span>
</section>
