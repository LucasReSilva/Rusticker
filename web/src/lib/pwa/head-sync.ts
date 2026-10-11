import type { Locale } from '$lib/paraglide/runtime';
import { headTags } from '$lib/seo/head';
import { pageFromUrl } from '$lib/seo/urls';

/**
 * Rewrites the `data-pwa-seo` head elements for the current URL after a
 * client-side navigation (design D5), with the same builder as the server
 * handle. On a page that is not public (e.g. not found) the canonical and
 * alternates are removed, and the manifest follows the active locale.
 */
export function syncHeadTags(doc: Document, url: URL, base: string, locale: Locale): void {
	const match = pageFromUrl(url, base);
	const tags = headTags(match?.page ?? '/', match?.locale ?? locale, base);
	const keep = new Set<string>();

	for (const { key, tag, attrs } of tags) {
		if (match === undefined && (key === 'canonical' || key.startsWith('alternate-'))) continue;
		keep.add(key);
		let element = doc.head.querySelector(`[data-pwa-seo="${key}"]`);
		if (element === null) {
			element = doc.createElement(tag);
			element.setAttribute('data-pwa-seo', key);
			doc.head.append(element);
		}
		for (const [name, value] of Object.entries(attrs)) {
			if (element.getAttribute(name) !== value) element.setAttribute(name, value);
		}
	}
	for (const element of doc.head.querySelectorAll('[data-pwa-seo]')) {
		if (!keep.has(element.getAttribute('data-pwa-seo') ?? '')) element.remove();
	}
}
