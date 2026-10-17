<script lang="ts">
	import { tick } from 'svelte';
	import Pipette from '@lucide/svelte/icons/pipette';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Plus from '@lucide/svelte/icons/plus';
	import Undo2 from '@lucide/svelte/icons/undo-2';
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
		onPick,
		canUndoWorkspaceEdit = false,
		proposalBoxes = [],
		onAddBounds = () => {},
		onUpdateBounds = () => {},
		onUndoWorkspaceEdit = () => {}
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
		canUndoWorkspaceEdit?: boolean;
		proposalBoxes?: BBox[];
		onAddBounds?: (bounds: BBox) => void;
		onUpdateBounds?: (index: number, bounds: BBox) => void;
		onUndoWorkspaceEdit?: () => void;
	} = $props();
	const hintId = $props.id();
	let active = $state(false);
	let position = $state<Point>({ x: 0, y: 0 });
	let announcement = $state('');
	let overlay: SVGSVGElement;
	let toggle = $state<HTMLButtonElement | null>(null);
	let viewport: HTMLDivElement;
	let zoom = $state<number>(1);
	let drawMode = $state(false);
	let draftBox = $state<BBox | null>(null);
	let dragBoxDraft = $state<{ index: number; bounds: BBox } | null>(null);
	let drawStart: Point | null = null;
	let boxDrag = $state<{ index: number; start: Point; original: BBox; resize: boolean } | null>(
		null
	);
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
	function capturePointer(element: Element, pointerId: number) {
		const target = element as Element & { setPointerCapture?: (pointerId: number) => void };
		target.setPointerCapture?.(pointerId);
	}
	function keyboardPan(node: HTMLDivElement) {
		function start(event: PointerEvent) {
			if (
				event.pointerType === 'touch' ||
				event.button !== 0 ||
				active ||
				(event.target instanceof Element &&
					event.target.closest('[data-candidate-box], [data-resize-handle]'))
			)
				return;
			panDrag = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
			capturePointer(node, event.pointerId);
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
	function sourcePoint(event: PointerEvent): Point {
		const bounds = overlay.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(width, ((event.clientX - bounds.x) * width) / bounds.width)),
			y: Math.max(0, Math.min(height, ((event.clientY - bounds.y) * height) / bounds.height))
		};
	}
	function startDrawing(event: PointerEvent) {
		if (!drawMode || busy || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		drawStart = sourcePoint(event);
		draftBox = { x: drawStart.x, y: drawStart.y, width: 0, height: 0 };
		capturePointer(overlay, event.pointerId);
	}
	function startBoxDrag(index: number, event: PointerEvent, resize: boolean) {
		if (busy || drawMode || event.button !== 0) return;
		const original = boxes[index];
		if (!original) return;
		event.preventDefault();
		event.stopPropagation();
		boxDrag = { index, start: sourcePoint(event), original: { ...original }, resize };
		dragBoxDraft = { index, bounds: { ...original } };
		capturePointer(overlay, event.pointerId);
	}
	function moveWorkspacePointer(event: PointerEvent) {
		if (drawStart) {
			const point = sourcePoint(event);
			draftBox = {
				x: Math.min(drawStart.x, point.x),
				y: Math.min(drawStart.y, point.y),
				width: Math.abs(point.x - drawStart.x),
				height: Math.abs(point.y - drawStart.y)
			};
			return;
		}
		if (!boxDrag) return;
		const point = sourcePoint(event);
		const dx = Math.round(point.x - boxDrag.start.x);
		const dy = Math.round(point.y - boxDrag.start.y);
		const original = boxDrag.original;
		const bounds = boxDrag.resize
			? {
					...original,
					width: Math.max(1, Math.min(width - original.x, original.width + dx)),
					height: Math.max(1, Math.min(height - original.y, original.height + dy))
				}
			: {
					...original,
					x: Math.max(0, Math.min(width - original.width, original.x + dx)),
					y: Math.max(0, Math.min(height - original.height, original.y + dy))
				};
		dragBoxDraft = { index: boxDrag.index, bounds };
	}
	function finishWorkspacePointer() {
		if (drawStart) {
			const box = draftBox;
			drawStart = null;
			draftBox = null;
			drawMode = false;
			if (box && box.width >= 1 && box.height >= 1) {
				const x = Math.floor(box.x);
				const y = Math.floor(box.y);
				onAddBounds({
					x,
					y,
					width: Math.max(1, Math.ceil(box.x + box.width) - x),
					height: Math.max(1, Math.ceil(box.y + box.height) - y)
				});
			}
			return;
		}
		if (!boxDrag || !dragBoxDraft) return;
		const { index, bounds } = dragBoxDraft;
		boxDrag = null;
		dragBoxDraft = null;
		onUpdateBounds(index, bounds);
	}
	function boxKeydown(index: number, event: KeyboardEvent) {
		if (!event.key.startsWith('Arrow') || busy) return;
		event.preventDefault();
		const current = boxes[index];
		if (!current) return;
		const step = event.shiftKey ? 10 : 1;
		const next = event.shiftKey
			? {
					...current,
					width: Math.max(
						1,
						Math.min(
							width - current.x,
							current.width +
								(event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)
						)
					),
					height: Math.max(
						1,
						Math.min(
							height - current.y,
							current.height +
								(event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
						)
					)
				}
			: {
					...current,
					x: Math.max(
						0,
						Math.min(
							width - current.width,
							current.x +
								(event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)
						)
					),
					y: Math.max(
						0,
						Math.min(
							height - current.height,
							current.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
						)
					)
				};
		onUpdateBounds(index, next);
	}
</script>

<section aria-busy={busy} class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="font-display text-xl font-semibold">{m.tool_preview_heading()}</h2>
		<div class="flex flex-wrap items-center gap-1">
			<Button
				variant={drawMode ? 'default' : 'outline'}
				aria-label={drawMode ? m.tool_workspace_cancel_add() : m.tool_workspace_add()}
				aria-pressed={drawMode}
				disabled={busy}
				onclick={() => {
					drawMode = !drawMode;
					draftBox = null;
				}}><Plus aria-hidden="true" />{m.tool_workspace_add()}</Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.tool_workspace_undo()}
				disabled={!canUndoWorkspaceEdit || busy}
				onclick={onUndoWorkspaceEdit}><Undo2 aria-hidden="true" /></Button
			>
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
			<svg
				bind:this={overlay}
				viewBox="0 0 {width} {height}"
				class="pointer-events-auto absolute inset-0 size-full focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
				class:cursor-crosshair={active || drawMode}
				class:touch-none={drawMode || boxDrag !== null}
				role={active ? 'application' : 'group'}
				tabindex={active ? 0 : undefined}
				aria-label={active ? m.tool_eyedropper_area_label() : m.tool_inspector_area()}
				aria-describedby={hintId}
				onkeydown={keydown}
				onpointerdown={(event) => {
					if (drawMode) startDrawing(event);
					else pointer(event);
				}}
				onpointermove={moveWorkspacePointer}
				onpointerup={finishWorkspacePointer}
				onpointercancel={finishWorkspacePointer}
			>
				<rect x="0" y="0" {width} {height} class="fill-transparent" aria-hidden="true" />
				{#each boxes as box, index (index)}
					{@const visibleBox = dragBoxDraft?.index === index ? dragBoxDraft.bounds : box}
					<g
						role="button"
						tabindex="0"
						aria-label={m.tool_workspace_box({ position: formatNumber(index + 1) })}
						data-candidate-box={index}
						onpointerdown={(event) => startBoxDrag(index, event, false)}
						onkeydown={(event) => boxKeydown(index, event)}
					>
						<rect
							x={visibleBox.x}
							y={visibleBox.y}
							width={visibleBox.width}
							height={visibleBox.height}
							vector-effect="non-scaling-stroke"
							class="fill-none stroke-primary stroke-2 focus-visible:stroke-ring"
							data-detection-box
						/>
						<circle
							role="button"
							tabindex="0"
							aria-label={m.tool_bounds_resize_se()}
							aria-keyshortcuts="Shift+ArrowRight Shift+ArrowDown"
							cx={visibleBox.x + visibleBox.width}
							cy={visibleBox.y + visibleBox.height}
							r={5 / zoom}
							vector-effect="non-scaling-stroke"
							class="fill-background stroke-primary stroke-2"
							data-resize-handle
							onpointerdown={(event) => startBoxDrag(index, event, true)}
							onkeydown={(event) => boxKeydown(index, event)}
						/>
					</g>
				{/each}
				{#each proposalBoxes as box, index (index)}<rect
						x={box.x}
						y={box.y}
						width={box.width}
						height={box.height}
						vector-effect="non-scaling-stroke"
						class="fill-accent/15 stroke-accent stroke-2"
						data-split-proposal-box={index}
					/>{/each}
				{#if draftBox}<rect
						x={draftBox.x}
						y={draftBox.y}
						width={draftBox.width}
						height={draftBox.height}
						vector-effect="non-scaling-stroke"
						class="fill-primary/20 stroke-primary stroke-2"
						data-draft-box
					/>{/if}
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
		{active
			? m.tool_eyedropper_keyboard_hint()
			: drawMode
				? m.tool_workspace_keyboard_help()
				: m.tool_inspector_help()}
	</p>
	<p class="sr-only" aria-live="polite">{announcement}</p>
	<span class="sr-only">{toHex(background)}</span>
</section>
