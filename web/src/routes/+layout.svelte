<script lang="ts">
	import { base } from '$app/paths';
	import '../app.css';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
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

<div class="flex min-h-dvh flex-col">
	<AppHeader />

	<main id="main-content" class="flex-1">
		{#key locale.current}
			{@render children()}
		{/key}
	</main>

	<AppFooter />
</div>

<Toaster />

<PwaRegistration />
