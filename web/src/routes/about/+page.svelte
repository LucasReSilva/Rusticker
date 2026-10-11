<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.meta_about_title()}</title>
	<meta name="description" content={m.meta_about_description()} />
</svelte:head>

<h1>{m.page_about_heading()}</h1>
<p>{m.page_about_intro()}</p>
<h2>{m.page_about_privacy_heading()}</h2>
<p>{m.page_about_privacy_body()}</p>
<p>{m.page_about_no_account_body()}</p>
<p>{m.page_about_open_source_body()}</p>
