import { goto } from '$app/navigation';
import { page } from '$app/state';
import { setLocale, type Locale } from '$lib/paraglide/runtime';
import { basePath } from './links';
import { locale as activeLocale } from './locale.svelte';
import { localizeCurrentUrl } from './localize-url';
import { saveLocalePreference } from './preference';

/**
 * Switches the language without reloading the document (design D11): saves
 * the preference, then navigates in-app to the same page in the new locale,
 * keeping the query string and the hash. This is the only supported way to
 * change the locale; never call Paraglide's reloading `setLocale(locale)`.
 */
export async function switchLocale(locale: Locale): Promise<void> {
	saveLocalePreference(locale);
	setLocale(locale, { reload: false });
	const target = localizeCurrentUrl(page.url, locale, basePath());
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- target already includes the base path
	await goto(target);
	activeLocale.set(locale);
}
