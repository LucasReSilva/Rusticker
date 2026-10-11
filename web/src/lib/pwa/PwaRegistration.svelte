<script lang="ts">
	// Registers the service worker and keeps the SEO/install head tags in sync
	// with client-side navigations (design D3, D5). Renders nothing.
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { locale } from '$lib/i18n/locale.svelte';
	import { BASE_PATH } from '$lib/seo/site';
	import { syncHeadTags } from './head-sync';
	import { registerServiceWorker } from './update.svelte';

	onMount(() => {
		void registerServiceWorker();
	});

	afterNavigate(({ to }) => {
		if (to) syncHeadTags(document, to.url, BASE_PATH, locale.current);
	});
</script>
