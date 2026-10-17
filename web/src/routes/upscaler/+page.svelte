<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ArrowDownToLine, ImagePlus, X } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import { Progress } from '$lib/components/ui/progress';
	import { m } from '$lib/paraglide/messages';
	import {
		MAX_IMAGE_PIXELS,
		MAX_IMAGE_SIDE,
		MAX_SCALE,
		MIN_SCALE,
		SCALE_STEP,
		inspectImageFile,
		scaledDimensions,
		type ImageDimensions,
		type ImageInspectionError
	} from '$lib/upscaling/image';
	import {
		previewInWorker,
		upscaleInWorker,
		type UpscaleError,
		type UpscaleStage
	} from '$lib/upscaling/process';

	let input: HTMLInputElement;
	let file = $state<File>();
	let sourceUrl = $state('');
	let resultUrl = $state('');
	let sourceDimensions = $state<ImageDimensions>();
	let scale = $state(2);
	let stage = $state<UpscaleStage>();
	let busy = $state(false);
	let previewing = $state(false);
	let error = $state<string>();
	let activeJob: ReturnType<typeof upscaleInWorker> | undefined;
	let activePreview: ReturnType<typeof previewInWorker> | undefined;
	let scaleSlider = $state<HTMLElement | null>(null);
	let selectionId = 0;

	const outputDimensions = $derived.by(() => {
		if (!sourceDimensions) return undefined;
		try {
			return scaledDimensions(sourceDimensions, scale);
		} catch {
			return undefined;
		}
	});
	const stageLabel = $derived(
		stage === 'decoding'
			? m.upscaler_progress_decode()
			: stage === 'resizing'
				? m.upscaler_progress_resize()
				: stage === 'encoding'
					? m.upscaler_progress_encode()
					: m.upscaler_progress_waiting()
	);
	$effect(() => {
		scaleSlider?.querySelector('[role="slider"]')?.setAttribute('aria-valuetext', `${scale}×`);
	});

	function releaseResult() {
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		resultUrl = '';
	}

	function stopJob() {
		activeJob?.cancel();
		activePreview?.cancel();
		activeJob = undefined;
		activePreview = undefined;
		busy = false;
		stage = undefined;
	}

	async function selectFile(selected?: File) {
		if (!selected) return;
		stopJob();
		const currentSelection = ++selectionId;
		releaseResult();
		if (sourceUrl) URL.revokeObjectURL(sourceUrl);
		sourceUrl = '';
		file = selected;
		sourceDimensions = undefined;
		error = undefined;
		previewing = true;
		try {
			const inspected = await inspectImageFile(selected);
			if (currentSelection !== selectionId) return;
			const previewJob = previewInWorker(selected, inspected);
			activePreview = previewJob;
			const preview = await previewJob.result;
			if (currentSelection !== selectionId) return;
			sourceDimensions = preview.source;
			sourceUrl = URL.createObjectURL(preview.blob);
		} catch (cause) {
			if (cause !== 'Cancelled') {
				error = imageError(
					cause instanceof Error ? (cause.message as ImageInspectionError) : String(cause)
				);
			}
		} finally {
			if (currentSelection === selectionId) {
				activePreview = undefined;
				previewing = false;
			}
		}
	}

	function imageError(code: ImageInspectionError | UpscaleError | string) {
		switch (code) {
			case 'UnsupportedFormat':
				return m.upscaler_error_unsupported();
			case 'MalformedImage':
				return m.upscaler_error_malformed();
			case 'AnimatedImage':
				return m.upscaler_error_animated();
			case 'ImageTooLarge':
				return m.upscaler_error_limits();
			case 'DimensionMismatch':
				return m.upscaler_error_malformed();
			case 'UnsupportedEnvironment':
				return m.upscaler_error_environment();
			case 'DecodeFailed':
				return m.upscaler_error_decode();
			case 'EncodeFailed':
				return m.upscaler_error_encode();
			default:
				return m.upscaler_error_generic();
		}
	}

	async function run() {
		if (!file || !sourceDimensions || busy || previewing || !outputDimensions) return;
		releaseResult();
		error = undefined;
		busy = true;
		try {
			activeJob = upscaleInWorker(
				file,
				{ width: sourceDimensions.width, height: sourceDimensions.height },
				scale,
				(next) => (stage = next),
				(source) => (sourceDimensions = source)
			);
			const blob = await activeJob.result;
			resultUrl = URL.createObjectURL(blob);
		} catch (cause) {
			if (cause !== 'Cancelled') {
				error = imageError(String(cause));
			}
		} finally {
			activeJob = undefined;
			busy = false;
			stage = undefined;
		}
	}

	onDestroy(() => {
		selectionId++;
		stopJob();
		if (sourceUrl) URL.revokeObjectURL(sourceUrl);
		releaseResult();
	});
</script>

<svelte:head>
	<title>{m.meta_upscaler_title()}</title>
	<meta name="description" content={m.meta_upscaler_description()} />
</svelte:head>

<div class="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6">
	<header class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">{m.upscaler_heading()}</h1>
		<p class="max-w-3xl text-muted-foreground">{m.upscaler_description()}</p>
		<p class="text-sm text-muted-foreground">{m.upscaler_method_note()}</p>
	</header>

	<Card.Root>
		<Card.Content class="flex flex-col gap-5 p-5">
			<input
				bind:this={input}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				class="sr-only"
				aria-label={m.upscaler_select_image()}
				onchange={(event) => void selectFile((event.currentTarget as HTMLInputElement).files?.[0])}
			/>
			<div class="flex flex-wrap items-center gap-3">
				<Button onclick={() => input?.click()} disabled={busy || previewing}>
					<ImagePlus class="me-2 size-4" aria-hidden="true" />
					{file ? m.upscaler_replace_image() : m.upscaler_select_image()}
				</Button>
				{#if file}
					<p class="min-w-0 truncate text-sm text-muted-foreground">{file.name}</p>
				{/if}
			</div>

			{#if sourceDimensions}
				<div class="grid min-w-0 gap-6 lg:grid-cols-2">
					<section class="flex min-w-0 flex-col gap-2">
						<h2 class="font-semibold">{m.upscaler_source_heading()}</h2>
						<img
							src={sourceUrl}
							alt={m.upscaler_source_alt()}
							class="max-h-96 max-w-full rounded-md border border-border object-contain"
						/>
						<p class="text-sm text-muted-foreground">
							{m.upscaler_dimensions({
								width: sourceDimensions.width,
								height: sourceDimensions.height
							})}
						</p>
					</section>
					<section class="flex min-w-0 flex-col gap-2">
						<h2 class="font-semibold">{m.upscaler_result_heading()}</h2>
						{#if resultUrl}
							<img
								src={resultUrl}
								alt={m.upscaler_result_alt()}
								class="max-h-96 max-w-full rounded-md border border-border object-contain"
							/>
						{:else}
							<div
								class="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
							>
								{m.upscaler_result_placeholder()}
							</div>
						{/if}
						{#if outputDimensions}
							<p class="text-sm text-muted-foreground">
								{m.upscaler_dimensions({
									width: outputDimensions.width,
									height: outputDimensions.height
								})}
							</p>
						{/if}
					</section>
				</div>

				<div class="flex flex-col gap-2">
					<label for="upscaler-scale" class="font-medium">{m.upscaler_scale_label()}</label>
					<div class="flex flex-wrap items-center gap-3">
						<Slider
							bind:ref={scaleSlider}
							id="upscaler-scale"
							type="single"
							value={scale}
							min={MIN_SCALE}
							max={MAX_SCALE}
							step={SCALE_STEP}
							disabled={busy || previewing}
							thumbLabel={m.upscaler_scale_label()}
							aria-valuetext={`${scale}×`}
							class="w-full max-w-md"
							onValueChange={(value) => (scale = value)}
						/>
						<output for="upscaler-scale" class="font-medium">{scale}×</output>
					</div>
					<p class="text-sm text-muted-foreground">
						{m.upscaler_limits({ side: MAX_IMAGE_SIDE, pixels: MAX_IMAGE_PIXELS })}
					</p>
					{#if !outputDimensions}<p role="alert" class="text-sm text-destructive">
							{m.upscaler_output_limit_error()}
						</p>{/if}
				</div>

				<div class="flex flex-wrap gap-2">
					<Button onclick={() => void run()} disabled={busy || previewing || !outputDimensions}>
						{m.upscaler_run_action()}
					</Button>
					{#if busy}
						<Button variant="outline" onclick={stopJob}>
							<X class="me-2 size-4" aria-hidden="true" />{m.upscaler_cancel_action()}
						</Button>
					{/if}
					{#if resultUrl}
						<Button variant="outline" href={resultUrl} download="rusticker-upscaled.png">
							<ArrowDownToLine class="me-2 size-4" aria-hidden="true" />
							{m.upscaler_download_action()}
						</Button>
					{/if}
				</div>
				{#if busy}<p role="status" aria-live="polite">{stageLabel}</p>
					<Progress
						value={null}
						aria-label={stageLabel}
						class="motion-safe:animate-pulse [&>[data-slot=progress-indicator]]:transform-none!"
					/>{/if}
				{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
			{:else if previewing}
				<p role="status" aria-live="polite">{m.upscaler_progress_decode()}</p>
			{:else if file && error}
				<p role="alert" class="text-sm text-destructive">{error}</p>
			{:else}
				<Button
					variant="outline"
					class="h-auto min-h-40 w-full flex-col gap-2 border-dashed p-6 text-center whitespace-normal text-muted-foreground"
					onclick={() => input?.click()}
				>
					<ImagePlus class="size-8 text-primary" aria-hidden="true" />
					<span>{m.upscaler_empty_state()}</span>
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
