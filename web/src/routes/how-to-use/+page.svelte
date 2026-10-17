<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.meta_how_to_use_title()}</title>
	<meta name="description" content={m.meta_how_to_use_description()} />
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:py-12">
	<header class="max-w-2xl border-s-2 border-primary ps-4 sm:ps-6">
		<h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">
			{m.page_how_to_use_heading()}
		</h1>
		<p class="mt-3 text-lg text-muted-foreground">{m.page_how_to_use_intro()}</p>
	</header>
	<section
		class="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7"
		aria-label={m.page_how_to_use_heading()}
	>
		<ol class="grid list-inside list-decimal gap-3 sm:grid-cols-2">
			<li
				id="step-1"
				class="rounded-lg bg-muted p-4 leading-relaxed marker:font-semibold marker:text-primary"
			>
				{m.page_how_to_use_step_prepare()}
			</li>
			<li
				id="step-2"
				class="rounded-lg bg-muted p-4 leading-relaxed marker:font-semibold marker:text-primary"
			>
				{m.page_how_to_use_step_open()}
			</li>
			<li
				id="step-3"
				class="rounded-lg bg-muted p-4 leading-relaxed marker:font-semibold marker:text-primary"
			>
				{m.page_how_to_use_step_adjust()}
			</li>
			<li
				id="step-4"
				class="rounded-lg bg-muted p-4 leading-relaxed marker:font-semibold marker:text-primary"
			>
				{m.page_how_to_use_step_download()}
			</li>
			<li
				id="step-5"
				class="rounded-lg bg-muted p-4 leading-relaxed marker:font-semibold marker:text-primary sm:col-span-2"
			>
				{m.page_how_to_use_step_import()}
			</li>
		</ol>
		<p class="mt-5 border-s-2 border-primary ps-4 text-sm leading-relaxed text-muted-foreground">
			{m.page_how_to_use_import_note()}
		</p>
	</section>
</div>
