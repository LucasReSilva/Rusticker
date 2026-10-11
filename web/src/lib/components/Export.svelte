<script lang="ts">
	import { Download, Info } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import type { Sticker } from '$lib/detection/types';
	import {
		canvasEncoder,
		createExportController,
		downloadBlob,
		ExportError,
		MIN_STICKERS_PER_PACK,
		stickerSizes
	} from '$lib/export';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let {
		stickers,
		trayIconId,
		detecting
	}: { stickers: Sticker[]; trayIconId: string | null; detecting: boolean } = $props();
	const controller = createExportController({
		getStickers: () => stickers,
		getTrayIconId: () => trayIconId,
		isDetecting: () => detecting,
		sizes: stickerSizes,
		encoder: canvasEncoder,
		download: downloadBlob
	});
	const number = (value: number) => new Intl.NumberFormat(getLocale()).format(value);
	const progressLabel = $derived(
		m.export_progress_label({
			done: number(controller.progress.done),
			total: number(controller.progress.total)
		})
	);
	const label = $derived(
		controller.phase === 'exporting'
			? progressLabel
			: controller.plan.packSizes.length > 1
				? m.export_download_all_button({ total: number(controller.plan.packSizes.length) })
				: m.export_download_button()
	);

	async function exportAll() {
		try {
			const result = await controller.exportAll();
			if (!result) return;
			toast.success(
				m.export_success_toast({ count: number(result.stickerCount), packs: result.packCount })
			);
			if (result.overBudgetCount)
				toast.warning(m.export_over_budget_warning({ count: result.overBudgetCount }));
		} catch (error) {
			toast.error(
				error instanceof ExportError && error.code === 'WebpUnsupported'
					? m.export_error_webp_unsupported()
					: m.export_error_failed()
			);
		}
	}
</script>

<div class="space-y-4">
	<Button onclick={exportAll} disabled={!controller.canExport}>
		<Download aria-hidden="true" />
		{label}
	</Button>
	{#if controller.plan.stickerCount < MIN_STICKERS_PER_PACK}
		<p class="text-sm text-muted-foreground">
			{m.export_min_stickers_notice({ min: number(MIN_STICKERS_PER_PACK) })}
		</p>
	{/if}
	{#if controller.plan.packSizes.length > 1}
		<p class="flex items-start gap-2 text-sm text-muted-foreground">
			<Info class="size-4 shrink-0" aria-hidden="true" />
			{m.export_split_notice({
				count: number(controller.plan.stickerCount),
				packs: number(controller.plan.packSizes.length)
			})}
		</p>
	{/if}
	{#if controller.phase === 'exporting'}
		<Progress
			value={controller.progress.done}
			max={controller.progress.total}
			aria-label={progressLabel}
		/>
		<p class="text-sm text-muted-foreground" aria-live="polite">{progressLabel}</p>
	{/if}
	{#if controller.archives.length > 1}
		<div class="flex flex-wrap gap-2">
			{#each controller.archives as archive, index (archive.fileName)}
				<Button
					variant="secondary"
					disabled={!controller.canExport}
					onclick={() => controller.downloadPack(index)}
				>
					{m.export_download_pack_button({
						n: number(index + 1),
						total: number(controller.archives.length)
					})}
				</Button>
			{/each}
		</div>
	{/if}
</div>
