<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn, type WithoutChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChild<DropdownMenuPrimitive.RadioItemProps> = $props();
</script>

<DropdownMenuPrimitive.RadioItem
	bind:ref
	{closeOnSelect}
	data-slot="dropdown-menu-radio-item"
	class={cn(
		"relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-2 pe-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span
			class="pointer-events-none absolute end-2 flex items-center justify-center"
			data-slot="dropdown-menu-radio-item-indicator"
		>
			{#if checked}
				<CheckIcon aria-hidden="true" />
			{/if}
		</span>
		{@render childrenProp?.({ checked })}
	{/snippet}
</DropdownMenuPrimitive.RadioItem>
