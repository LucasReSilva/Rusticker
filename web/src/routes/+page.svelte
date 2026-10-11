<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.meta_tool_title()}</title>
	<meta name="description" content={m.meta_tool_description()} />
</svelte:head>

<h1>{m.app_tool_heading()}</h1>
<p>{m.app_tool_placeholder()}</p>
