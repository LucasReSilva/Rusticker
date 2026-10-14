<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { getEditor } from '$lib/state.svelte';
	import { m } from '$lib/paraglide/messages';
	import { processingHistoryEnabled, recordProcessingRun } from './store';

	const editor = getEditor();
	let recordedSequence = 0;

	$effect(() => {
		const sequence = editor.completedRunSequence;
		const source = editor.source;
		if (!sequence || sequence === recordedSequence || !source) return;
		recordedSequence = sequence;
		void recordProcessingRun({
			file: source.file,
			width: source.width,
			height: source.height,
			background: editor.background,
			tolerance: editor.tolerance,
			stickerCount: editor.stickers.length
		}).then((result) => {
			if (result === 'unavailable' && processingHistoryEnabled()) {
				toast.warning(m.history_save_unavailable());
			}
		});
	});
</script>
