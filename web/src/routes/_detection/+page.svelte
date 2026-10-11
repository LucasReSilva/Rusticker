<script lang="ts">
	// Dev-only diagnostics for the detection runtime (design D9). No visible
	// copy: a native file input, numbers, and sticker canvases. Codes and
	// bounding boxes go to the console. `window.__rusticker_detection` lets the
	// e2e suite run synthetic images through the same path.
	import { onDestroy } from 'svelte';
	import {
		createDetector,
		DetectionError,
		isCancelled,
		type DetectInput,
		type DetectOptions,
		type Sticker
	} from '$lib/detection';

	const defaults: DetectOptions = { background: { r: 0, g: 255, b: 0 }, tolerance: 50 };

	const detector = createDetector();
	onDestroy(() => detector.dispose());

	let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
	let code = $state('');
	let elapsed = $state(0);
	let stickers = $state.raw<Sticker[]>([]);

	type Outcome =
		{ status: 'done'; count: number } | { status: 'error' | 'cancelled'; code: string };

	async function run(image: DetectInput, options: DetectOptions = defaults): Promise<Outcome> {
		status = 'running';
		const started = performance.now();
		try {
			const result = await detector.detect(image, options);
			elapsed = Math.round(performance.now() - started);
			stickers = result;
			status = 'done';
			code = '';
			console.log(
				'[detection] ok',
				result.length,
				result.map((s) => s.bbox)
			);
			return { status: 'done', count: result.length };
		} catch (failure) {
			if (isCancelled(failure)) {
				console.log('[detection] cancelled');
				return { status: 'cancelled', code: 'AbortError' };
			}
			const failed = failure instanceof DetectionError ? failure.code : 'Unknown';
			elapsed = Math.round(performance.now() - started);
			stickers = [];
			status = 'error';
			code = failed;
			console.log('[detection] error', failed, failure);
			return { status: 'error', code: failed };
		}
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const bitmap = await createImageBitmap(file);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return;
		context.drawImage(bitmap, 0, 0);
		bitmap.close();
		await run(context.getImageData(0, 0, canvas.width, canvas.height));
	}

	function paint(canvas: HTMLCanvasElement, pixels: ImageData) {
		canvas.getContext('2d')?.putImageData(pixels, 0, 0);
	}

	Object.assign(window, {
		__rusticker_detection: {
			run,
			/** Builds ImageData from raw RGBA bytes (e2e helper). */
			image: (data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number) =>
				new ImageData(data, width, height)
		}
	});
</script>

<section
	class="flex flex-col gap-4 p-4"
	data-testid="detection"
	data-status={status}
	data-code={code}
>
	<input type="file" accept="image/*" onchange={onFile} data-testid="file" />
	<p class="flex gap-4 tabular-nums">
		<output data-testid="count">{stickers.length}</output>
		<output data-testid="elapsed">{elapsed}</output>
	</p>
	<ul class="flex flex-wrap gap-2">
		{#each stickers as sticker (sticker.id)}
			<li>
				<canvas
					class="size-32"
					width={sticker.pixels.width}
					height={sticker.pixels.height}
					data-bbox={`${sticker.bbox.x},${sticker.bbox.y},${sticker.bbox.width},${sticker.bbox.height}`}
					{@attach (canvas) => paint(canvas, sticker.pixels)}
				></canvas>
			</li>
		{/each}
	</ul>
</section>
