<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import { m } from '$lib/paraglide/messages';
	let {
		compact = false,
		disabled = false,
		onFile,
		onReject
	}: {
		compact?: boolean;
		disabled?: boolean;
		onFile: (file: File) => void;
		onReject: () => void;
	} = $props();
	let input: HTMLInputElement;
	let depth = $state(0);
	let hovered = $state(false);
	const dropState = $derived(depth > 0 ? 'dragging' : hovered ? 'hover' : 'idle');
	function choose(files: FileList | File[] | null) {
		if (disabled || !files?.length) return;
		const image = Array.from(files).find((file) => file.type.startsWith('image/'));
		if (image) onFile(image);
		else onReject();
	}
	function open() {
		if (!disabled) input.click();
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
		{#if !compact}<p class="text-sm text-muted-foreground">{m.tool_dropzone_hint()}</p>{/if}
	</div>
</Card.Root>
