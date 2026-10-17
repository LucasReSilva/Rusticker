<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.meta_about_title()}</title>
	<meta name="description" content={m.meta_about_description()} />
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:py-12">
	<header class="max-w-2xl border-s-2 border-primary ps-4 sm:ps-6">
		<h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">
			{m.page_about_heading()}
		</h1>
		<p class="mt-3 text-lg text-muted-foreground">{m.page_about_intro()}</p>
	</header>
	<section class="grid gap-4 md:grid-cols-2" aria-labelledby="about-privacy-heading">
		<div class="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
			<h2 id="about-privacy-heading" class="font-display text-xl font-semibold">
				{m.page_about_privacy_heading()}
			</h2>
			<p class="mt-3 leading-relaxed text-muted-foreground">{m.page_about_privacy_body()}</p>
		</div>
		<div class="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
			<p class="leading-relaxed text-muted-foreground">{m.page_about_no_account_body()}</p>
			<p class="mt-4 leading-relaxed text-muted-foreground">
				{m.page_about_open_source_body()}
			</p>
		</div>
	</section>
</div>
