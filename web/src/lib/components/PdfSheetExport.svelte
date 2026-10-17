<script lang="ts">
	import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Minus, Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Sticker } from '$lib/detection/types';
	import { Button } from '$lib/components/ui/button';
	import {
		exportPdfSheets,
		movePdfSticker,
		pageDimensions,
		layoutPdfSheets,
		PdfExportError,
		resizePdfSticker,
		type PdfOrientation,
		type PdfPaper,
		type PdfSheetLayout,
		type PdfStickerPlacement
	} from '$lib/export';
	import { downloadBlob } from '$lib/export/download';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let { stickers, disabled = false }: { stickers: Sticker[]; disabled?: boolean } = $props();
	let paper = $state<PdfPaper>('a4');
	let orientation = $state<PdfOrientation>('portrait');
	let margin = $state(10);
	let spacing = $state(5);
	let selectedStickerId = $state<string | null>(null);
	let exporting = $state(false);
	let previews = $state<HTMLElement | null>(null);
	let layout = $state.raw<PdfSheetLayout>(makeLayout());
	let drag = $state<{
		id: string;
		pointerX: number;
		pointerY: number;
		layout: PdfSheetLayout;
	} | null>(null);
	const number = (value: number) => new Intl.NumberFormat(getLocale()).format(value);
	const pageSize = $derived(pageDimensions({ paper, orientation }));
	const selectedPlacement = $derived(
		layout.pages
			.flatMap((page) => page.placements)
			.find(({ stickerId }) => stickerId === selectedStickerId)
	);

	function makeLayout() {
		return layoutPdfSheets(
			stickers.map(({ id, pixels }) => ({ id, width: pixels.width, height: pixels.height })),
			{ paper, orientation, margin, spacing }
		);
	}

	function resetLayout() {
		try {
			layout = makeLayout();
		} catch {
			// Configuration buttons are bounded so a page always retains a printable area.
		}
		if (
			!layout.pages
				.flatMap(({ placements }) => placements)
				.some(({ stickerId }) => stickerId === selectedStickerId)
		)
			selectedStickerId = null;
	}

	$effect(() => {
		stickers.forEach(({ id, pixels }) => {
			void id;
			void pixels;
		});
		const placementIds = layout.pages.flatMap(({ placements }) =>
			placements.map(({ stickerId }) => stickerId)
		);
		const stickerIds = stickers.map(({ id }) => id);
		if (
			placementIds.length !== stickerIds.length ||
			placementIds.some((id, index) => id !== stickerIds[index])
		) {
			layout = makeLayout();
			selectedStickerId = null;
		}
	});

	$effect(() => {
		const root = previews;
		const current = layout;
		const list = stickers;
		if (!root) return;
		for (const canvas of root.querySelectorAll<HTMLCanvasElement>('canvas[data-sheet-page]')) {
			const pageIndex = Number(canvas.dataset.sheetPage);
			const page = current.pages[pageIndex];
			if (!page) continue;
			drawPage(canvas, page.placements, list, current, selectedStickerId);
		}
	});

	function changeSettings(
		change: Partial<{
			paper: PdfPaper;
			orientation: PdfOrientation;
			margin: number;
			spacing: number;
		}>
	) {
		if (change.paper) paper = change.paper;
		if (change.orientation) orientation = change.orientation;
		if (change.margin !== undefined) margin = change.margin;
		if (change.spacing !== undefined) spacing = change.spacing;
		drag = null;
		resetLayout();
	}

	function editMove(dx: number, dy: number) {
		if (selectedStickerId) layout = movePdfSticker(layout, selectedStickerId, dx, dy);
	}

	function editSize(factor: number) {
		if (selectedStickerId) layout = resizePdfSticker(layout, selectedStickerId, factor);
	}

	function handleKeydown(event: KeyboardEvent) {
		const step = Math.max(1, spacing || 1);
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step]
		};
		if (moves[event.key]) {
			event.preventDefault();
			editMove(...moves[event.key]);
		} else if (event.key === '+' || event.key === '=') {
			event.preventDefault();
			editSize(1.1);
		} else if (event.key === '-') {
			event.preventDefault();
			editSize(0.9);
		}
	}

	function pointerDown(event: PointerEvent, pageIndex: number) {
		const canvas = event.currentTarget as HTMLCanvasElement;
		const page = layout.pages[pageIndex];
		if (!page) return;
		const point = canvasPoint(canvas, event);
		const placement = [...page.placements]
			.reverse()
			.find((candidate) => contains(candidate, point.x, point.y));
		if (!placement) return;
		selectedStickerId = placement.stickerId;
		drag = { id: placement.stickerId, pointerX: point.x, pointerY: point.y, layout };
		canvas.setPointerCapture(event.pointerId);
	}

	function pointerMove(event: PointerEvent) {
		if (!drag) return;
		const point = canvasPoint(event.currentTarget as HTMLCanvasElement, event);
		layout = movePdfSticker(drag.layout, drag.id, point.x - drag.pointerX, point.y - drag.pointerY);
	}

	function pointerUp() {
		drag = null;
	}

	function canvasPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) / rect.width) * layout.pageWidth,
			y: ((event.clientY - rect.top) / rect.height) * layout.pageHeight
		};
	}

	function contains(placement: PdfStickerPlacement, x: number, y: number) {
		return (
			x >= placement.x &&
			x <= placement.x + placement.width &&
			y >= placement.y &&
			y <= placement.y + placement.height
		);
	}

	async function exportSheets() {
		if (!stickers.length || disabled || exporting) return;
		exporting = true;
		try {
			const result = await exportPdfSheets(stickers, layout);
			await downloadBlob(result.blob, result.fileName);
			toast.success(m.pdf_sheet_export_success({ pages: result.pageCount }));
		} catch (error) {
			toast.error(
				error instanceof PdfExportError && error.code === 'CompressionUnsupported'
					? m.pdf_sheet_export_unsupported()
					: m.pdf_sheet_export_failed()
			);
		} finally {
			exporting = false;
		}
	}

	function drawPage(
		canvas: HTMLCanvasElement,
		placements: PdfStickerPlacement[],
		stickerList: Sticker[],
		current: PdfSheetLayout,
		selectedId: string | null
	) {
		const context = canvas.getContext('2d');
		if (!context || typeof context.fillRect !== 'function') return;
		const scale = canvas.width / current.pageWidth;
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = getComputedStyle(canvas).backgroundColor;
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.strokeStyle = getComputedStyle(canvas).color;
		context.setLineDash([scale, scale]);
		context.strokeRect(
			current.settings.margin * scale,
			current.settings.margin * scale,
			(current.pageWidth - current.settings.margin * 2) * scale,
			(current.pageHeight - current.settings.margin * 2) * scale
		);
		context.setLineDash([]);
		for (const placement of placements) {
			const sticker = stickerList.find(({ id }) => id === placement.stickerId);
			if (!sticker) continue;
			const source = stickerCanvas(sticker.pixels);
			context.drawImage(
				source,
				placement.x * scale,
				placement.y * scale,
				placement.width * scale,
				placement.height * scale
			);
			if (selectedId === placement.stickerId) {
				context.strokeStyle = getComputedStyle(canvas).color;
				context.lineWidth = Math.max(1, scale / 2);
				context.strokeRect(
					placement.x * scale,
					placement.y * scale,
					placement.width * scale,
					placement.height * scale
				);
			}
		}
	}

	const rasterCache = new WeakMap<ImageData, HTMLCanvasElement>();
	function stickerCanvas(pixels: ImageData) {
		let source = rasterCache.get(pixels);
		if (!source) {
			source = document.createElement('canvas');
			source.width = pixels.width;
			source.height = pixels.height;
			source.getContext('2d')?.putImageData(pixels, 0, 0);
			rasterCache.set(pixels, source);
		}
		return source;
	}
</script>

<section class="space-y-4" aria-labelledby="pdf-sheet-heading">
	<h3 id="pdf-sheet-heading" class="text-sm font-medium">{m.pdf_sheet_heading()}</h3>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">{m.pdf_sheet_paper_label()}</p>
			<div class="flex flex-wrap gap-2" role="group" aria-label={m.pdf_sheet_paper_label()}>
				<Button
					variant={paper === 'a4' ? 'default' : 'outline'}
					aria-pressed={paper === 'a4'}
					onclick={() => changeSettings({ paper: 'a4' })}>{m.pdf_sheet_a4()}</Button
				>
				<Button
					variant={paper === 'letter' ? 'default' : 'outline'}
					aria-pressed={paper === 'letter'}
					onclick={() => changeSettings({ paper: 'letter' })}>{m.pdf_sheet_letter()}</Button
				>
			</div>
		</div>
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">{m.pdf_sheet_orientation_label()}</p>
			<div class="flex flex-wrap gap-2" role="group" aria-label={m.pdf_sheet_orientation_label()}>
				<Button
					variant={orientation === 'portrait' ? 'default' : 'outline'}
					aria-pressed={orientation === 'portrait'}
					onclick={() => changeSettings({ orientation: 'portrait' })}
					>{m.pdf_sheet_portrait()}</Button
				>
				<Button
					variant={orientation === 'landscape' ? 'default' : 'outline'}
					aria-pressed={orientation === 'landscape'}
					onclick={() => changeSettings({ orientation: 'landscape' })}
					>{m.pdf_sheet_landscape()}</Button
				>
			</div>
		</div>
	</div>
	<div class="flex flex-wrap gap-4">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">
				{m.pdf_sheet_margin_label({ value: number(margin) })}
			</p>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="icon"
					aria-label={m.pdf_sheet_margin_decrease()}
					disabled={margin <= 0}
					onclick={() => changeSettings({ margin: Math.max(0, margin - 1) })}
					><Minus aria-hidden="true" /></Button
				>
				<Button
					variant="outline"
					size="icon"
					aria-label={m.pdf_sheet_margin_increase()}
					disabled={margin >= 40}
					onclick={() => changeSettings({ margin: Math.min(40, margin + 1) })}
					><Plus aria-hidden="true" /></Button
				>
			</div>
		</div>
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">
				{m.pdf_sheet_spacing_label({ value: number(spacing) })}
			</p>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="icon"
					aria-label={m.pdf_sheet_spacing_decrease()}
					disabled={spacing <= 0}
					onclick={() => changeSettings({ spacing: Math.max(0, spacing - 1) })}
					><Minus aria-hidden="true" /></Button
				>
				<Button
					variant="outline"
					size="icon"
					aria-label={m.pdf_sheet_spacing_increase()}
					disabled={spacing >= 20}
					onclick={() => changeSettings({ spacing: Math.min(20, spacing + 1) })}
					><Plus aria-hidden="true" /></Button
				>
			</div>
		</div>
	</div>
	<p class="text-sm text-muted-foreground">
		{m.pdf_sheet_page_size({ width: number(pageSize.width), height: number(pageSize.height) })}
	</p>
	<p class="text-sm text-muted-foreground">{m.pdf_sheet_edit_instructions()}</p>
	{#if !stickers.length}
		<p class="text-sm text-muted-foreground">{m.pdf_sheet_empty()}</p>
	{:else}
		<div class="space-y-4" bind:this={previews}>
			{#each layout.pages as page (page.index)}
				<figure class="space-y-2">
					<figcaption class="text-sm font-medium">
						{m.pdf_sheet_page_label({
							page: number(page.index + 1),
							total: number(layout.pages.length)
						})}
					</figcaption>
					<canvas
						data-sheet-page={page.index}
						class="w-full max-w-lg touch-none border border-border bg-card text-foreground"
						width={Math.round(layout.pageWidth * 3)}
						height={Math.round(layout.pageHeight * 3)}
						aria-label={m.pdf_sheet_page_label({
							page: number(page.index + 1),
							total: number(layout.pages.length)
						})}
						tabindex="0"
						onpointerdown={(event) => pointerDown(event, page.index)}
						onpointermove={pointerMove}
						onpointerup={pointerUp}
						onpointercancel={pointerUp}
						onkeydown={handleKeydown}
					></canvas>
				</figure>
			{/each}
		</div>
		<div
			class="flex flex-wrap items-center gap-2"
			role="group"
			aria-label={m.pdf_sheet_edit_controls_label()}
		>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_move_left()}
				disabled={!selectedPlacement}
				onclick={() => editMove(-Math.max(1, spacing), 0)}><ArrowLeft aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_move_up()}
				disabled={!selectedPlacement}
				onclick={() => editMove(0, -Math.max(1, spacing))}><ArrowUp aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_move_down()}
				disabled={!selectedPlacement}
				onclick={() => editMove(0, Math.max(1, spacing))}><ArrowDown aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_move_right()}
				disabled={!selectedPlacement}
				onclick={() => editMove(Math.max(1, spacing), 0)}><ArrowRight aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_resize_smaller()}
				disabled={!selectedPlacement}
				onclick={() => editSize(0.9)}><Minus aria-hidden="true" /></Button
			>
			<Button
				variant="outline"
				size="icon"
				aria-label={m.pdf_sheet_resize_larger()}
				disabled={!selectedPlacement}
				onclick={() => editSize(1.1)}><Plus aria-hidden="true" /></Button
			>
			{#each stickers as sticker, index (sticker.id)}
				<Button
					variant={selectedStickerId === sticker.id ? 'secondary' : 'outline'}
					aria-pressed={selectedStickerId === sticker.id}
					onclick={() => (selectedStickerId = sticker.id)}
					>{m.pdf_sheet_select_sticker({ sticker: number(index + 1) })}</Button
				>
			{/each}
		</div>
	{/if}
	<Button onclick={exportSheets} disabled={!stickers.length || disabled || exporting}>
		<Download aria-hidden="true" />
		{exporting ? m.pdf_sheet_export_progress() : m.pdf_sheet_export_button()}
	</Button>
</section>
