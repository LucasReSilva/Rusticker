<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getEditor } from '$lib/state.svelte';
	import { detectionErrorMessage } from '$lib/detection';
	import DropZone from '$lib/components/DropZone.svelte';
	import Preview from '$lib/components/Preview.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import Grid from '$lib/components/Grid.svelte';
	import Export from '$lib/components/Export.svelte';
	import { stickerSizes } from '$lib/export';
	import { m } from '$lib/paraglide/messages';
	const editor = getEditor();
	$effect(() => {
		stickerSizes.sync(editor.stickers);
	});
	let seenError = 0;
	$effect(() => {
		if (!editor.lastError || editor.errorSequence === seenError) return;
		seenError = editor.errorSequence;
		const code = editor.lastError;
		toast.error(
			code === 'UnsupportedFile'
				? m.tool_error_unsupported_file()
				: code === 'DecodeFailed'
					? m.tool_error_decode_failed()
					: code === 'Unknown'
						? m.tool_error_unknown()
						: detectionErrorMessage(code)
		);
	});
	onMount(() => {
		function paste(event: ClipboardEvent) {
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest('input, textarea, [contenteditable]:not([contenteditable="false"])'))
				return;
			const items = Array.from(event.clipboardData?.items ?? []);
			const image = items
				.find((item) => item.kind === 'file' && item.type.startsWith('image/'))
				?.getAsFile();
			if (image) {
				event.preventDefault();
				void editor.loadFile(image);
			} else if (items.some((item) => item.kind === 'file')) editor.rejectFile();
		}
		window.addEventListener('paste', paste);
		return () => window.removeEventListener('paste', paste);
	});
</script>

<svelte:head>
	<title>{m.meta_tool_title()}</title>
	<meta name="description" content={m.meta_tool_description()} />
</svelte:head>

<div class="mx-auto flex max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6">
	<h1 class="font-display text-3xl font-bold">{m.app_tool_heading()}</h1>
	<DropZone
		compact={!!editor.source}
		onFile={(file) => void editor.loadFile(file)}
		onReject={() => editor.rejectFile()}
	/>
	{#if editor.source}
		<div class="grid min-w-0 items-start gap-6 lg:grid-cols-2">
			<div class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
				<Preview
					src={editor.source.url}
					width={editor.source.width}
					height={editor.source.height}
					imageData={editor.source.imageData}
					boxes={editor.stickers.map((sticker) => sticker.bbox)}
					background={editor.background}
					busy={editor.isProcessing}
					onPick={(color) => editor.setBackground(color)}
				/>
				<Controls
					tolerance={editor.tolerance}
					background={editor.background}
					busy={editor.isProcessing}
					hasImage={!!editor.source}
					onToleranceChange={(value) => editor.setTolerance(value)}
				/>
			</div>
			<div class="flex min-w-0 flex-col gap-4">
				<p aria-live="polite" aria-atomic="true" data-detected-count>
					{editor.isProcessing
						? m.tool_processing_label()
						: m.tool_detected_count({ count: editor.stickers.length })}
				</p>
				<Grid
					stickers={editor.stickers}
					sizeOf={stickerSizes.get}
					trayIconId={editor.trayIconId}
					busy={editor.isProcessing}
					pending={editor.isProcessing && !editor.detected.length}
					onRemove={(id) => editor.removeSticker(id)}
					onSetTrayIcon={(id) => editor.setTrayIcon(id)}
					splitPreview={editor.splitPreview}
					splitBusyId={editor.splitBusyId}
					noSplitProposalId={editor.noSplitProposalId}
					undoableStickerIds={editor.undoableStickerIds}
					onSplitRequest={(id) => void editor.requestSplit(id)}
					onSplitAccept={() => editor.acceptSplit()}
					onSplitDiscard={() => editor.discardSplit()}
					onSplitUndo={(id) => editor.undoSplit(id)}
				/>
				<section data-slot="export" aria-label={m.tool_export_region_label()}>
					<Export
						stickers={editor.stickers}
						trayIconId={editor.trayIconId}
						detecting={editor.isProcessing}
					/>
				</section>
			</div>
		</div>
	{:else if editor.isProcessing}
		<Controls
			tolerance={editor.tolerance}
			background={editor.background}
			busy={true}
			hasImage={false}
			onToleranceChange={(value) => editor.setTolerance(value)}
		/>
		<Grid
			stickers={editor.stickers}
			sizeOf={stickerSizes.get}
			trayIconId={editor.trayIconId}
			busy={true}
			pending={true}
			onRemove={(id) => editor.removeSticker(id)}
			onSetTrayIcon={(id) => editor.setTrayIcon(id)}
			splitPreview={editor.splitPreview}
			splitBusyId={editor.splitBusyId}
			noSplitProposalId={editor.noSplitProposalId}
			undoableStickerIds={editor.undoableStickerIds}
			onSplitRequest={(id) => void editor.requestSplit(id)}
			onSplitAccept={() => editor.acceptSplit()}
			onSplitDiscard={() => editor.discardSplit()}
			onSplitUndo={(id) => editor.undoSplit(id)}
		/>
	{/if}
</div>
