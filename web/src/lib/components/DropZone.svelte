<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import { base } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	let {
		compact = false,
		disabled = false,
		multiple = false,
		onFiles,
		onReject
	}: {
		compact?: boolean;
		disabled?: boolean;
		multiple?: boolean;
		onFiles: (files: File[]) => void;
		onReject: () => void;
	} = $props();
	let input: HTMLInputElement;
	let depth = $state(0);
	let hovered = $state(false);
	let loadingSample = $state(false);
	const dropState = $derived(depth > 0 ? 'dragging' : hovered ? 'hover' : 'idle');
	function choose(files: FileList | File[] | null) {
		if (disabled || !files?.length) return;
		const selected = Array.from(files);
		const images = selected.filter((file) => file.type.startsWith('image/'));
		if (images.length) onFiles(multiple ? images : images.slice(0, 1));
		if (!images.length || images.length !== selected.length) onReject();
	}
	function open() {
		if (!disabled) input.click();
	}
	export function openPicker(): boolean {
		if (disabled || !input || typeof input.showPicker !== 'function') return false;
		try {
			input.showPicker();
			return true;
		} catch {
			return false;
		}
	}
	async function trySample() {
		if (disabled || loadingSample) return;
		loadingSample = true;
		try {
			const res = await fetch(`${base}/samples/rust-stickers.png`);
			if (!res.ok) {
				onReject();
				return;
			}
			const blob = await res.blob();
			const file = new File([blob], 'rust-stickers.png', { type: 'image/png' });
			onFiles([file]);
		} catch {
			onReject();
		} finally {
			loadingSample = false;
		}
	}
</script>

<Card.Root
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-disabled={disabled}
	aria-label={compact ? m.tool_dropzone_replace() : m.tool_dropzone_title()}
	data-state={dropState}
	data-tool-dropzone
	class="cursor-pointer border-2 border-dashed border-input p-6 text-center hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none data-[state=dragging]:border-primary data-[state=dragging]:bg-accent data-[state=hover]:bg-accent motion-safe:transition-colors"
	onclick={open}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			open();
		}
	}}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
	ondragenter={(event) => {
		event.preventDefault();
		if (!disabled) depth++;
	}}
	ondragleave={(event) => {
		event.preventDefault();
		depth = Math.max(0, depth - 1);
	}}
	ondragover={(event) => event.preventDefault()}
	ondrop={(event) => {
		event.preventDefault();
		depth = 0;
		choose(event.dataTransfer?.files ?? null);
	}}
>
	<input
		bind:this={input}
		type="file"
		accept="image/*"
		{multiple}
		class="hidden"
		tabindex="-1"
		{disabled}
		onclick={(event) => event.stopPropagation()}
		onchange={() => {
			choose(input.files);
			input.value = '';
		}}
	/>
	<div class="flex flex-col items-center gap-2">
		<ImagePlus
			class={compact ? 'size-6 text-primary' : 'size-10 text-primary'}
			aria-hidden="true"
		/>
		<p class="font-semibold">
			{dropState === 'dragging'
				? m.tool_dropzone_dragging()
				: compact
					? m.tool_dropzone_replace()
					: m.tool_dropzone_title()}
		</p>
		{#if !compact}
			<p class="text-sm text-muted-foreground">{m.tool_dropzone_hint()}</p>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				class="mt-2"
				disabled={disabled || loadingSample}
				data-tool-sample-button
				onclick={(event) => {
					event.stopPropagation();
					void trySample();
				}}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.stopPropagation();
					}
				}}
			>
				{m.dropzone_try_sample()}
			</Button>
		{/if}
	</div>
</Card.Root>
