<script lang="ts">
	import { page } from '$app/state';
	import { localizedPath } from '$lib/i18n/links';
	import { locale } from '$lib/i18n/locale.svelte';
	import { m } from '$lib/paraglide/messages';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? m.meta_not_found_title() : m.app_error_title()}</title>
</svelte:head>

<h1>{notFound ? m.app_not_found_title() : m.app_error_title()}</h1>
<p>{notFound ? m.app_not_found_body() : m.app_error_body()}</p>
<p><a href={localizedPath('tool', locale.current)}>{m.app_back_to_tool()}</a></p>
