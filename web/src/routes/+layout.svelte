<script lang="ts">
	import { base } from '$app/paths';
	import '../app.css';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { afterNavigate } from '$app/navigation';
	import { locale, syncLocaleFromUrl } from '$lib/i18n/locale.svelte';
	import PwaRegistration from '$lib/pwa/PwaRegistration.svelte';

	let { children } = $props();

	afterNavigate(({ to }) => {
		if (to) syncLocaleFromUrl(to.url);
	});

	// Documents served from 404.html start as pt-BR; keep <html lang> in sync.
	$effect(() => {
		document.documentElement.lang = locale.current;
	});
</script>

<svelte:head><link rel="icon" type="image/png" href="{base}/logo.png" /></svelte:head>

<AppHeader />

<main id="main-content">
	{#key locale.current}
		{@render children()}
	{/key}
</main>

<Toaster />

<PwaRegistration />
