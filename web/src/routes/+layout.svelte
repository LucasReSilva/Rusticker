<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { localizedPath } from '$lib/i18n/links';
	import { locale, syncLocaleFromUrl } from '$lib/i18n/locale.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();

	afterNavigate(({ to }) => {
		if (to) syncLocaleFromUrl(to.url);
	});

	// Documents served from 404.html start as pt-BR; keep <html lang> in sync.
	$effect(() => {
		document.documentElement.lang = locale.current;
	});

	const opts = $derived({ locale: locale.current });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- @design-tokens:header -->
<header>
	<a href={localizedPath('tool', locale.current)}>{m.app_name({}, opts)}</a>
	<nav aria-label={m.nav_label({}, opts)}>
		<ul>
			<li><a href={localizedPath('tool', locale.current)}>{m.nav_tool({}, opts)}</a></li>
			<li>
				<a href={localizedPath('howToUse', locale.current)}>{m.nav_how_to_use({}, opts)}</a>
			</li>
			<li><a href={localizedPath('about', locale.current)}>{m.nav_about({}, opts)}</a></li>
		</ul>
	</nav>
</header>
<!-- /@design-tokens:header -->

<main id="main-content">
	{#key locale.current}
		{@render children()}
	{/key}
</main>

<!-- @design-tokens:toaster -->

<!-- @pwa-seo:registration -->
