<script lang="ts">
	import { mode } from 'mode-watcher';
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { m } from '$lib/paraglide/messages';
	import { locale } from '$lib/i18n/locale.svelte';

	// Assistive labels default to the active locale's messages (text-free kit).
	let { containerAriaLabel, closeButtonAriaLabel, ...restProps }: SonnerProps = $props();

	const messageOptions = $derived({ locale: locale.current });
</script>

<!-- Toasts follow mode-watcher's resolved mode and use theme tokens only. -->
<Sonner
	theme={mode.current ?? 'system'}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border); --border-radius: var(--radius);"
	containerAriaLabel={containerAriaLabel ?? m.a11y_notifications({}, messageOptions)}
	closeButtonAriaLabel={closeButtonAriaLabel ?? m.a11y_close({}, messageOptions)}
	toastOptions={{
		classes: {
			toast: 'cn-toast font-sans shadow-lg',
			description: 'text-muted-foreground',
			actionButton: 'bg-primary! text-primary-foreground!',
			cancelButton: 'bg-muted! text-muted-foreground!',
			closeButton:
				'bg-popover! text-popover-foreground! border-border! focus-visible:ring-3! focus-visible:ring-ring!'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" aria-hidden="true" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4 text-destructive" aria-hidden="true" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" aria-hidden="true" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" aria-hidden="true" />
	{/snippet}
</Sonner>
