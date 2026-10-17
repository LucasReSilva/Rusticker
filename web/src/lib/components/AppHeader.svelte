<script lang="ts">
	import { base } from '$app/paths';
	import { ModeWatcher } from 'mode-watcher';
	import { page } from '$app/state';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { localizedPath } from '$lib/i18n/links';
	import { locale } from '$lib/i18n/locale.svelte';
	import type { PageId } from '$lib/i18n/routes.js';
	import { m } from '$lib/paraglide/messages';

	const opts = $derived({ locale: locale.current });

	// Route directories are English and locale-neutral (see routes.js).
	const routeIds: Record<string, PageId> = {
		'/how-to-use': 'howToUse',
		'/about': 'about',
		'/history': 'history'
	};
	const active = $derived(page.route.id ? routeIds[page.route.id] : undefined);

	const links = $derived<Array<{ id: PageId; label: string }>>([
		{ id: 'howToUse', label: m.nav_how_to_use({}, opts) },
		{ id: 'about', label: m.nav_about({}, opts) },
		{ id: 'history', label: m.nav_history({}, opts) }
	]);

	/** Moves focus to the main landmark (a plain fragment link would only scroll). */
	function skipToContent(event: MouseEvent) {
		const main = document.getElementById('main-content');
		if (!main) return;
		event.preventDefault();
		if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
		main.focus();
		main.scrollIntoView();
	}
</script>

<ModeWatcher />

<a
	href="#main-content"
	onclick={skipToContent}
	class="sr-only rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
>
	{m.a11y_skip_to_content({}, opts)}
</a>

<header class="border-b border-border bg-background">
	<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
		<a
			href={localizedPath('tool', locale.current)}
			class="flex items-center gap-2 rounded-md font-display text-xl font-bold text-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
		>
			<img src="{base}/logo.png" alt="" class="h-7 w-7 object-contain" />
			<span>{m.app_name({}, opts)}</span>
		</a>
		<nav aria-label={m.a11y_main_navigation({}, opts)} class="min-w-0">
			<ul class="flex flex-wrap gap-x-4 gap-y-1">
				{#each links as link (link.id)}
					<li>
						<a
							href={localizedPath(link.id, locale.current)}
							aria-current={active === link.id ? 'page' : undefined}
							class="rounded-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:font-semibold aria-[current=page]:text-primary aria-[current=page]:underline"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<div class="ms-auto flex items-center gap-1">
			<ThemeToggle />
			<LanguageSwitcher />
		</div>
	</div>
</header>
