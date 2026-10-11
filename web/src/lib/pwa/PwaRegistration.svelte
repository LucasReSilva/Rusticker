<script lang="ts">
	// Registers the service worker (design D3). Renders nothing.
	import { onMount } from 'svelte';
	import { registerServiceWorker } from './update.svelte';

	onMount(() => {
		void registerServiceWorker();
	});
</script>
