<script lang="ts">
	import { version } from '../../../package.json';
	import { localizedPath } from '$lib/i18n/links';
	import { locale } from '$lib/i18n/locale.svelte';
	import { m } from '$lib/paraglide/messages';

	const opts = $derived({ locale: locale.current });
	const linkClass =
		'rounded-sm text-foreground underline decoration-border underline-offset-4 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none';
</script>

<footer class="border-t border-border bg-background text-muted-foreground">
	<div
		class="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex min-w-0 flex-col gap-1">
			<p>{m.footer_version({ version }, opts)}</p>
			<p>{m.footer_processing_local({}, opts)}</p>
		</div>
		<nav aria-label={m.footer_navigation({}, opts)}>
			<ul class="flex flex-wrap gap-x-4 gap-y-2">
				<li>
					<a class={linkClass} href={localizedPath('about', locale.current)}
						>{m.footer_privacy({}, opts)}</a
					>
				</li>
				<li>
					<a class={linkClass} href="https://github.com/LucasReSilva/Rusticker"
						>{m.footer_repository({}, opts)}</a
					>
				</li>
				<li>
					<a
						class={linkClass}
						href="https://github.com/LucasReSilva/Rusticker/blob/main/CHANGELOG.md"
						>{m.footer_changelog({}, opts)}</a
					>
				</li>
			</ul>
		</nav>
	</div>
</footer>
