<script lang="ts">
	import { tick } from 'svelte';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { formatNumber } from '$lib/format';
	import { applyBrushStroke, type BrushMode, type BrushPoint } from '$lib/tool/sticker-brush';
	import type { Sticker } from '$lib/detection';
	import { m } from '$lib/paraglide/messages';

	let {
		sticker,
		source,
		resetPixels,
		onApply,
		onCancel
	}: {
		sticker: Sticker;
		source: ImageData;
		resetPixels: ImageData;
		onApply: (pixels: ImageData) => void;
		onCancel: () => void;
	} = $props();
	const id = $props.id();
	const ZOOM_LEVELS = [1, 2, 4, 8] as const;
	const MAX_HISTORY_STATES = 20;
	function stickerSnapshot() {
		return copyImageData(sticker.pixels);
	}
	function resetSnapshot() {
		return copyImageData(resetPixels);
	}
	const initialPixels = stickerSnapshot();
	const resetImage = resetSnapshot();
	let history = $state<ImageData[]>([initialPixels]);
	let historyIndex = $state(0);
	let mode = $state<BrushMode>('erase');
	let brushSize = $state(32);
	let zoom = $state<number>(1);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let viewport = $state<HTMLDivElement | undefined>(undefined);
	let drawing: { points: BrushPoint[]; pointerId: number } | null = null;
	let panDrag: { x: number; y: number; left: number; top: number; pointerId: number } | null = null;
	let spacePressed = false;
	let current = $derived(history[historyIndex]);
	let canUndo = $derived(historyIndex > 0);
	let canRedo = $derived(historyIndex < history.length - 1);
	let changed = $derived(!samePixels(current, initialPixels));
	let canReset = $derived(historyIndex > 0 || !samePixels(initialPixels, resetImage));
	const sizeId = `${id}-brush-size`;
	const helpId = `${id}-brush-area-help`;

	$effect(() => {
		const pixels = current;
		canvas?.getContext('2d')?.putImageData(pixels, 0, 0);
	});

	function copyImageData(image: ImageData): ImageData {
		return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
	}

	function samePixels(left: ImageData, right: ImageData): boolean {
		if (left.width !== right.width || left.height !== right.height) return false;
		for (let index = 0; index < left.data.length; index++) {
			if (left.data[index] !== right.data[index]) return false;
		}
		return true;
	}

	function pointFromEvent(event: PointerEvent): BrushPoint | null {
		if (!canvas) return null;
		const bounds = canvas.getBoundingClientRect();
		if (bounds.width <= 0 || bounds.height <= 0) return null;
		return {
			x: Math.max(0, Math.min(511, ((event.clientX - bounds.left) / bounds.width) * 512)),
			y: Math.max(0, Math.min(511, ((event.clientY - bounds.top) / bounds.height) * 512))
		};
	}

	function startPan(event: PointerEvent) {
		if (!viewport || (event.button !== 1 && !(event.button === 0 && spacePressed))) return false;
		event.preventDefault();
		panDrag = {
			x: event.clientX,
			y: event.clientY,
			left: viewport.scrollLeft,
			top: viewport.scrollTop,
			pointerId: event.pointerId
		};
		canvas?.setPointerCapture(event.pointerId);
		return true;
	}

	function startStroke(event: PointerEvent) {
		if (startPan(event) || event.button !== 0) return;
		const point = pointFromEvent(event);
		if (!point) return;
		event.preventDefault();
		drawing = { points: [point], pointerId: event.pointerId };
		canvas?.setPointerCapture(event.pointerId);
	}

	function movePointer(event: PointerEvent) {
		if (panDrag?.pointerId === event.pointerId && viewport) {
			viewport.scrollLeft = panDrag.left + panDrag.x - event.clientX;
			viewport.scrollTop = panDrag.top + panDrag.y - event.clientY;
			return;
		}
		if (!drawing || drawing.pointerId !== event.pointerId) return;
		const point = pointFromEvent(event);
		if (point) drawing.points.push(point);
	}

	function finishStroke(event: PointerEvent) {
		if (panDrag?.pointerId === event.pointerId) {
			panDrag = null;
			return;
		}
		if (!drawing || drawing.pointerId !== event.pointerId) return;
		const point = pointFromEvent(event);
		if (point) drawing.points.push(point);
		const result = applyBrushStroke(current, source, sticker.bbox, {
			mode,
			size: brushSize,
			points: drawing.points
		});
		drawing = null;
		if (!result) return;
		history = [...history.slice(0, historyIndex + 1), result].slice(-MAX_HISTORY_STATES);
		historyIndex = history.length - 1;
	}

	function cancelStroke() {
		drawing = null;
		panDrag = null;
	}

	function undo() {
		if (canUndo) historyIndex -= 1;
	}

	function redo() {
		if (canRedo) historyIndex += 1;
	}

	function reset() {
		history = [copyImageData(resetImage)];
		historyIndex = 0;
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

	function handleKeyDown(event: KeyboardEvent) {
		if (event.code === 'Space' && event.target === viewport) {
			spacePressed = true;
			event.preventDefault();
		} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
		} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
			event.preventDefault();
			redo();
		} else if (event.target === viewport && event.key.startsWith('Arrow') && viewport) {
			event.preventDefault();
			const step = event.shiftKey ? viewport.clientWidth / 2 : viewport.clientWidth / 4;
			if (event.key === 'ArrowLeft') viewport.scrollLeft -= step;
			if (event.key === 'ArrowRight') viewport.scrollLeft += step;
			if (event.key === 'ArrowUp') viewport.scrollTop -= step;
			if (event.key === 'ArrowDown') viewport.scrollTop += step;
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.code === 'Space') spacePressed = false;
	}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} onblur={cancelStroke} />

<Card.Root class="gap-4 p-4" data-brush-editor>
	<div class="flex flex-col gap-1">
		<h3 class="font-medium">{m.tool_brush_title()}</h3>
		<p class="text-sm text-muted-foreground">{m.tool_brush_help()}</p>
	</div>
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label={m.tool_brush_title()}>
		<Button
			variant={mode === 'erase' ? 'default' : 'outline'}
			aria-pressed={mode === 'erase'}
			onclick={() => (mode = 'erase')}>{m.tool_brush_erase()}</Button
		>
		<Button
			variant={mode === 'restore' ? 'default' : 'outline'}
			aria-pressed={mode === 'restore'}
			onclick={() => (mode = 'restore')}>{m.tool_brush_restore()}</Button
		>
		<Button
			variant="outline"
			size="icon"
			aria-label={m.tool_brush_undo()}
			disabled={!canUndo}
			onclick={undo}><Undo2 aria-hidden="true" /></Button
		>
		<Button
			variant="outline"
			size="icon"
			aria-label={m.tool_brush_redo()}
			disabled={!canRedo}
			onclick={redo}><Redo2 aria-hidden="true" /></Button
		>
	</div>
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<label for={sizeId} class="font-medium">{m.tool_brush_size()}</label>
			<output for={sizeId}>{formatNumber(brushSize)}</output>
		</div>
		<Slider
			{...{ id: sizeId }}
			type="single"
			value={brushSize}
			min={4}
			max={128}
			step={4}
			thumbLabel={m.tool_brush_size()}
			aria-valuetext={formatNumber(brushSize)}
			onValueChange={(value) => (brushSize = value)}
		/>
	</div>
	<div class="flex flex-wrap items-center justify-end gap-1">
		<Button
			variant="outline"
			size="icon"
			aria-label={m.tool_brush_zoom_out()}
			disabled={zoom === ZOOM_LEVELS[0]}
			onclick={() =>
				changeZoom(
					ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]) - 1)]
				)}><ZoomOut aria-hidden="true" /></Button
		>
		<output class="min-w-12 text-center text-sm tabular-nums">{formatNumber(zoom * 100)}%</output>
		<Button
			variant="outline"
			size="icon"
			aria-label={m.tool_brush_zoom_in()}
			disabled={zoom === ZOOM_LEVELS.at(-1)}
			onclick={() =>
				changeZoom(
					ZOOM_LEVELS[
						Math.min(
							ZOOM_LEVELS.length - 1,
							ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]) + 1
						)
					]
				)}><ZoomIn aria-hidden="true" /></Button
		>
		<Button
			variant="outline"
			size="icon"
			aria-label={m.tool_brush_zoom_reset()}
			disabled={zoom === 1}
			onclick={() => changeZoom(1)}><RotateCcw aria-hidden="true" /></Button
		>
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={viewport}
		data-brush-area
		data-zoom={zoom}
		role="region"
		tabindex="0"
		aria-label={m.tool_brush_area()}
		aria-describedby={helpId}
		class="max-h-[70vh] overflow-auto rounded-lg border border-border bg-checkerboard focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
	>
		<div class="min-w-full" style:width={`${zoom * 100}%`}>
			<!-- This canvas is the local brush surface for one sticker. -->
			<canvas
				bind:this={canvas}
				width="512"
				height="512"
				aria-label={m.tool_brush_preview_alt()}
				aria-describedby={helpId}
				class="block aspect-square h-auto w-full cursor-crosshair touch-none"
				onpointerdown={startStroke}
				onpointermove={movePointer}
				onpointerup={finishStroke}
				onpointercancel={cancelStroke}
				onlostpointercapture={cancelStroke}
			></canvas>
		</div>
	</div>
	<p id={helpId} class="text-sm text-muted-foreground">{m.tool_brush_area_help()}</p>
	<div class="flex flex-wrap justify-end gap-2">
		<Button variant="outline" disabled={!canReset} onclick={reset}>{m.tool_brush_reset()}</Button>
		<Button variant="outline" onclick={onCancel}>{m.tool_brush_cancel()}</Button>
		<Button disabled={!changed} onclick={() => onApply(copyImageData(current))}
			>{m.tool_brush_apply()}</Button
		>
	</div>
</Card.Root>
