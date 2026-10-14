<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getEditor } from '$lib/state.svelte';
	import { detectionErrorMessage } from '$lib/detection';
	import DropZone from '$lib/components/DropZone.svelte';
	import BatchQueue from '$lib/components/BatchQueue.svelte';
	import BatchNotifications from '$lib/components/BatchNotifications.svelte';
	import Preview from '$lib/components/Preview.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import Grid from '$lib/components/Grid.svelte';
	import Export from '$lib/components/Export.svelte';
	import TelegramExport from '$lib/components/TelegramExport.svelte';
	import { stickerSizes } from '$lib/export';
	import { m } from '$lib/paraglide/messages';
	import HistoryRecorder from '$lib/history/HistoryRecorder.svelte';
	import WebMcpTools from '$lib/webmcp/WebMcpTools.svelte';
	import { mapEditorWorkflowStatus } from '$lib/webmcp/editorStatus';
	import type { WebMcpActions } from '$lib/webmcp/registry';
	import { MIN_STICKERS_PER_PACK } from '$lib/export';
	const editor = getEditor();
	let dropZone: { openPicker: () => boolean } | undefined;
	const webmcpActions: WebMcpActions = {
		openImagePicker: () => dropZone?.openPicker() ?? false,
		getEditorStatus: () =>
			mapEditorWorkflowStatus({
				hasImage: !!editor.source || editor.batchEntries.some((entry) => entry.status === 'done'),
				isProcessing: editor.isProcessing || editor.batchRunning,
				isReady: editor.status === 'ready',
				canExport: editor.batchStickers.length >= MIN_STICKERS_PER_PACK
			})
	};
	let processingMode = $state<'automatic' | 'advanced'>('automatic');
	$effect(() => {
		stickerSizes.sync(editor.batchStickers);
		editor.syncActiveBatch();
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
					: code === 'BatchLimitExceeded'
						? m.tool_error_batch_limit()
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
				editor.addBatchFiles([image]);
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
	<WebMcpTools actions={webmcpActions} />
	<HistoryRecorder />
	<h1 class="font-display text-3xl font-bold">{m.app_tool_heading()}</h1>
	<DropZone
		bind:this={dropZone}
		compact={!!editor.source}
		multiple={true}
		onFiles={(files) => editor.addBatchFiles(files)}
		onReject={() => editor.rejectFile()}
	/>
	<BatchQueue
		entries={editor.batchEntries}
		activeId={editor.activeBatchId}
		running={editor.batchRunning}
		onActivate={(id) => editor.activateBatchEntry(id)}
		onRetry={(id) => editor.retryBatchEntry(id)}
		onRemove={(id) => editor.removeBatchEntry(id)}
		onCancel={() => editor.cancelBatch()}
		onClear={() => editor.clearBatch()}
	/>
	<BatchNotifications entries={editor.batchEntries} running={editor.batchRunning} />
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
					advanced={processingMode === 'advanced'}
					onPick={(color) => editor.setBackground(color)}
				/>
				<Controls
					tolerance={editor.tolerance}
					background={editor.background}
					busy={editor.isProcessing}
					hasImage={!!editor.source}
					mode={processingMode}
					onModeChange={(mode) => (processingMode = mode)}
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
					trayIconId={editor.batchTrayIconId}
					busy={editor.isProcessing}
					pending={editor.isProcessing && !editor.detected.length}
					onRemove={(id) => editor.removeSticker(id)}
					onSetTrayIcon={(id) => editor.setTrayIcon(id)}
					onReorder={(id, index) => editor.reorderSticker(id, index)}
					splitPreview={editor.splitPreview}
					splitBusyId={editor.splitBusyId}
					noSplitProposalId={editor.noSplitProposalId}
					undoableStickerIds={editor.undoableStickerIds}
					allowSplitRequest={processingMode === 'advanced'}
					allowBoundsAdjustment={processingMode === 'advanced'}
					sourceWidth={editor.source.width}
					sourceHeight={editor.source.height}
					onSplitRequest={(id) => void editor.requestSplit(id)}
					onBoundsApply={(sticker) => editor.updateStickerBounds(sticker.id, sticker.bbox)}
					onSplitAccept={() => editor.acceptSplit()}
					onSplitDiscard={() => editor.discardSplit()}
					onSplitUndo={(id) => editor.undoSplit(id)}
				/>
				<section data-slot="export" aria-label={m.tool_export_region_label()}>
					<Export
						stickers={editor.batchStickers}
						trayIconId={editor.batchTrayIconId}
						detecting={editor.isProcessing}
					/>
					<TelegramExport stickers={editor.batchStickers} disabled={editor.isProcessing} />
				</section>
			</div>
		</div>
	{:else if editor.isProcessing}
		<Controls
			tolerance={editor.tolerance}
			background={editor.background}
			busy={true}
			hasImage={false}
			mode={processingMode}
			onModeChange={(mode) => (processingMode = mode)}
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
			onReorder={(id, index) => editor.reorderSticker(id, index)}
			splitPreview={editor.splitPreview}
			splitBusyId={editor.splitBusyId}
			noSplitProposalId={editor.noSplitProposalId}
			undoableStickerIds={editor.undoableStickerIds}
			allowSplitRequest={processingMode === 'advanced'}
			onSplitRequest={(id) => void editor.requestSplit(id)}
			onSplitAccept={() => editor.acceptSplit()}
			onSplitDiscard={() => editor.discardSplit()}
			onSplitUndo={(id) => editor.undoSplit(id)}
		/>
	{/if}
</div>
