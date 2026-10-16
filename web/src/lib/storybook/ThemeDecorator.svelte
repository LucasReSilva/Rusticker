<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, theme = 'light' }: { children: Snippet; theme?: 'light' | 'dark' } = $props();
</script>

<div class="{theme} min-h-dvh bg-background p-6 text-foreground">
	{@render children()}
</div>
