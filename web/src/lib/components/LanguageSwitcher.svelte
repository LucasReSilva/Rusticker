<script lang="ts" module>
	/**
	 * A language's own name in that language ("Português (Brasil)", "English",
	 * "Español"). Autonyms are the same in every UI language, so they are
	 * computed instead of living in the message catalogs (design D8).
	 */
	export function autonym(tag: string): string {
		const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? tag;
		return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1);
	}

	/** Short code shown on the trigger ("PT", "EN", "ES"). */
	export function shortCode(tag: string): string {
		return tag.split('-')[0].toLocaleUpperCase('en');
	}
</script>

<script lang="ts">
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { locale } from '$lib/i18n/locale.svelte';
	import { switchLocale } from '$lib/i18n/switch';
	import { m } from '$lib/paraglide/messages';
	import { isLocale, locales } from '$lib/paraglide/runtime';

	let trigger = $state<HTMLButtonElement | null>(null);

	const opts = $derived({ locale: locale.current });

	async function choose(value: string) {
		if (!isLocale(value) || value === locale.current) return;
		await switchLocale(value);
		// The in-app navigation resets focus to the document; keep the keyboard
		// user on the control they just used.
		trigger?.focus();
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		bind:ref={trigger}
		class={buttonVariants({ variant: 'ghost' })}
		aria-label={m.lang_switcher_label({}, opts)}
		title={m.lang_current({ language: autonym(locale.current) }, opts)}
		data-testid="language-switcher"
	>
		<LanguagesIcon aria-hidden="true" />
		<span aria-hidden="true">{shortCode(locale.current)}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-auto">
		<DropdownMenu.RadioGroup value={locale.current} onValueChange={choose}>
			{#each locales as tag (tag)}
				<DropdownMenu.RadioItem value={tag} lang={tag} closeOnSelect>
					{autonym(tag)}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
