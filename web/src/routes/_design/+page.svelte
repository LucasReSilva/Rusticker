<!--
	Vite replaces import.meta.env.DEV with false in production builds, so the
	dynamic import (and the whole showcase) is dropped from the shipped assets.
-->
{#if import.meta.env.DEV}
	{#await import('./Showcase.svelte') then mod}
		<mod.default />
	{/await}
{/if}
