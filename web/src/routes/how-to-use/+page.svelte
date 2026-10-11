<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.meta_how_to_use_title()}</title>
	<meta name="description" content={m.meta_how_to_use_description()} />
</svelte:head>

<h1>{m.page_how_to_use_heading()}</h1>
<p>{m.page_how_to_use_intro()}</p>
<ol>
	<li id="step-1">{m.page_how_to_use_step_prepare()}</li>
	<li id="step-2">{m.page_how_to_use_step_open()}</li>
	<li id="step-3">{m.page_how_to_use_step_adjust()}</li>
	<li id="step-4">{m.page_how_to_use_step_download()}</li>
	<li id="step-5">{m.page_how_to_use_step_import()}</li>
</ol>
<p>{m.page_how_to_use_import_note()}</p>
