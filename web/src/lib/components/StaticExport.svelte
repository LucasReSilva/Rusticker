<script lang="ts">
	import { Download } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Sticker } from '$lib/detection/types';
	import { Button } from '$lib/components/ui/button';
	import {
		canvasEncoder,
		downloadBlob,
		exportStaticStickers,
		StaticExportError
	} from '$lib/export';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let { stickers, disabled = false }: { stickers: Sticker[]; disabled?: boolean } = $props();
	let imageFormat = $state<'png' | 'webp' | 'jpeg'>('png');
	let archiveFormat = $state<'zip' | 'tar.gz'>('zip');
	let background = $state<string | undefined>();
	let exporting = $state(false);
	const number = (value: number) => new Intl.NumberFormat(getLocale()).format(value);

	async function exportFiles() {
		if (!stickers.length || disabled || exporting || (imageFormat === 'jpeg' && !background))
			return;
		exporting = true;
		try {
			const result = await exportStaticStickers(
				stickers,
				imageFormat,
				archiveFormat,
				background,
				canvasEncoder
			);
			downloadBlob(result.blob, result.fileName);
			toast.success(m.static_export_success({ count: number(result.stickerCount) }));
		} catch (error) {
			toast.error(
				error instanceof StaticExportError && error.code === 'JpegBackgroundRequired'
					? m.static_export_jpeg_background_required()
					: m.static_export_failed()
			);
		} finally {
			exporting = false;
		}
	}
</script>

<div class="space-y-3">
	<h3 class="text-sm font-medium">{m.static_export_heading()}</h3>
	<div class="space-y-2">
		<p class="text-sm text-muted-foreground">{m.static_export_image_format_label()}</p>
		<div
			class="flex flex-wrap gap-2"
			role="group"
			aria-label={m.static_export_image_format_label()}
		>
			<Button
				variant={imageFormat === 'png' ? 'default' : 'outline'}
				onclick={() => (imageFormat = 'png')}
			>
				{m.static_export_png()}
			</Button>
			<Button
				variant={imageFormat === 'webp' ? 'default' : 'outline'}
				onclick={() => (imageFormat = 'webp')}
			>
				{m.static_export_webp()}
			</Button>
			<Button
				variant={imageFormat === 'jpeg' ? 'default' : 'outline'}
				onclick={() => (imageFormat = 'jpeg')}
			>
				{m.static_export_jpeg()}
			</Button>
		</div>
	</div>
	{#if imageFormat === 'jpeg'}
		<label class="flex items-center gap-2 text-sm">
			<span>{m.static_export_background_label()}</span>
			<input
				type="color"
				aria-label={m.static_export_background_label()}
				value={background ?? '#ffffff'}
				onchange={(event) => (background = event.currentTarget.value)}
			/>
		</label>
		{#if !background}<p class="text-sm text-muted-foreground">
				{m.static_export_jpeg_background_required()}
			</p>{/if}
	{/if}
	<div class="space-y-2">
		<p class="text-sm text-muted-foreground">{m.static_export_archive_format_label()}</p>
		<div
			class="flex flex-wrap gap-2"
			role="group"
			aria-label={m.static_export_archive_format_label()}
		>
			<Button
				variant={archiveFormat === 'zip' ? 'default' : 'outline'}
				onclick={() => (archiveFormat = 'zip')}
			>
				{m.static_export_zip()}
			</Button>
			<Button
				variant={archiveFormat === 'tar.gz' ? 'default' : 'outline'}
				onclick={() => (archiveFormat = 'tar.gz')}
			>
				{m.static_export_tar_gz()}
			</Button>
		</div>
	</div>
	<Button
		onclick={exportFiles}
		disabled={!stickers.length || disabled || exporting || (imageFormat === 'jpeg' && !background)}
	>
		<Download aria-hidden="true" />
		{m.static_export_button()}
	</Button>
</div>
