<script lang="ts">
	import { Download, Info } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Sticker } from '$lib/detection/types';
	import { createCanvasEncoder } from '$lib/export/canvas';
	import { downloadBlob } from '$lib/export/download';
	import {
		exportTelegramStickers,
		TelegramExportError,
		type TelegramImageFormat
	} from '$lib/export/telegram';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let { stickers, disabled = false }: { stickers: Sticker[]; disabled?: boolean } = $props();
	let format = $state<TelegramImageFormat>('png');
	let exporting = $state(false);
	let progress = $state({ done: 0, total: 0 });
	const number = (value: number) => new Intl.NumberFormat(getLocale()).format(value);
	const encoder = createCanvasEncoder();

	async function exportFiles() {
		if (!stickers.length || disabled || exporting) return;
		exporting = true;
		try {
			const result = await exportTelegramStickers(stickers, format, encoder, (value) => {
				progress = value;
			});
			downloadBlob(result.blob, result.fileName);
			toast.success(m.telegram_export_success({ count: number(result.stickerCount) }));
		} catch (error) {
			toast.error(
				error instanceof TelegramExportError && error.code === 'WebpUnsupported'
					? m.telegram_export_webp_unsupported()
					: m.telegram_export_failed()
			);
		} finally {
			exporting = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap gap-2" role="group" aria-label={m.telegram_export_format_label()}>
		<Button variant={format === 'png' ? 'default' : 'outline'} onclick={() => (format = 'png')}>
			{m.telegram_export_png()}
		</Button>
		<Button variant={format === 'webp' ? 'default' : 'outline'} onclick={() => (format = 'webp')}>
			{m.telegram_export_webp()}
		</Button>
	</div>
	<Button onclick={exportFiles} disabled={!stickers.length || disabled || exporting}>
		<Download aria-hidden="true" />
		{exporting
			? m.telegram_export_progress({ done: number(progress.done), total: number(progress.total) })
			: m.telegram_export_button()}
	</Button>
	<p class="flex items-start gap-2 text-sm text-muted-foreground">
		<Info class="size-4 shrink-0" aria-hidden="true" />
		{m.telegram_export_instructions()}
	</p>
	{#if exporting}
		<Progress
			value={progress.done}
			max={progress.total || 1}
			aria-label={m.telegram_export_progress({
				done: number(progress.done),
				total: number(progress.total)
			})}
		/>
	{/if}
</div>
