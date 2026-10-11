<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { locale } from '$lib/i18n/locale.svelte';
	import { m } from '$lib/paraglide/messages';

	type Choice = 'light' | 'dark' | 'system';

	const opts = $derived({ locale: locale.current });
	const choices = $derived<Array<{ value: Choice; label: string }>>([
		{ value: 'light', label: m.theme_light({}, opts) },
		{ value: 'dark', label: m.theme_dark({}, opts) },
		{ value: 'system', label: m.theme_system({}, opts) }
	]);

	/** Light and dark override the system; "system" clears the override. */
	function choose(value: string) {
		if (value === 'light' || value === 'dark') setMode(value);
		else resetMode();
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={buttonVariants({ variant: 'ghost', size: 'icon' })}
		aria-label={m.theme_toggle_label({}, opts)}
		data-testid="theme-toggle"
	>
		<SunIcon class="dark:hidden" aria-hidden="true" />
		<MoonIcon class="hidden dark:block" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-auto">
		<DropdownMenu.RadioGroup value={userPrefersMode.current} onValueChange={choose}>
			{#each choices as choice (choice.value)}
				<DropdownMenu.RadioItem value={choice.value} closeOnSelect>
					{choice.label}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
