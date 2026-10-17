<script lang="ts">
	import { tick } from 'svelte';
	import Pipette from '@lucide/svelte/icons/pipette';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { BBox, Rgb } from '$lib/detection';
	import { moveCrosshair, sampleColor, toHex, type Point } from '$lib/tool/eyedropper';
	import { nextZoom, ZOOM_LEVELS } from '$lib/tool/inspector';
	import { formatNumber } from '$lib/format';
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
	let viewport: HTMLDivElement;
	let zoom = $state<number>(1);
	let panDrag: { x: number; y: number; left: number; top: number } | null = null;
	$effect(() => {
		if (!src) return;
		zoom = 1;
		if (viewport) {
			viewport.scrollLeft = 0;
			viewport.scrollTop = 0;
		}
	});
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
		if (event.target !== viewport || !event.key.startsWith('Arrow')) return;
		event.preventDefault();
		const step = event.shiftKey ? viewport.clientWidth / 2 : viewport.clientWidth / 4;
		if (event.key === 'ArrowLeft') viewport.scrollLeft -= step;
		if (event.key === 'ArrowRight') viewport.scrollLeft += step;
		if (event.key === 'ArrowUp') viewport.scrollTop -= step;
		if (event.key === 'ArrowDown') viewport.scrollTop += step;
	}
	function keyboardPan(node: HTMLDivElement) {
		function start(event: PointerEvent) {
			if (event.pointerType === 'touch' || event.button !== 0 || active) return;
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
		<div class="flex flex-wrap items-center gap-1">
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
	</div>
	<!-- This scrollable image region needs keyboard focus for arrow-key panning. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={viewport}
		use:keyboardPan
		data-source-inspector
		data-zoom={zoom}
		role="region"
		tabindex="0"
		aria-label={m.tool_inspector_area()}
		aria-describedby={hintId}
		class="max-h-96 overflow-auto rounded-lg border border-border bg-checkerboard focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
	>
		<div class="relative min-w-full" style:width={`${zoom * 100}%`}>
			<img {src} {width} {height} alt={m.tool_preview_alt()} class="block h-auto w-full" />
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
	</div>
	<p id={hintId} class={active ? 'text-sm text-muted-foreground' : 'sr-only'}>
		{active ? m.tool_eyedropper_keyboard_hint() : m.tool_inspector_help()}
	</p>
	<p class="sr-only" aria-live="polite">{announcement}</p>
	<span class="sr-only">{toHex(background)}</span>
</section>
