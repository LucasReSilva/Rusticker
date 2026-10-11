// The head elements of a page (design D5). One pure builder feeds both the
// server handle (static HTML) and the client updater (after navigations), so
// the two cannot diverge. Every element carries `data-pwa-seo="<key>"`.
import type { Locale } from '$lib/paraglide/runtime';
import { APPLE_TOUCH_ICON, THEME_COLOR, manifestPath } from './manifest';
import { absoluteUrl, alternates, localizedPath } from './urls';

export type HeadTag = {
	key: string;
	tag: 'link' | 'meta';
	attrs: Record<string, string>;
};

/**
 * The tags of a public page (`page` is its base-locale path) in a locale:
 * canonical, one alternate per locale plus `x-default`, the locale's
 * manifest, the Apple touch icon, and the theme color.
 */
export function headTags(page: string, locale: Locale, base: string, siteUrl?: string): HeadTag[] {
	return [
		{
			key: 'canonical',
			tag: 'link',
			attrs: { rel: 'canonical', href: absoluteUrl(localizedPath(page, locale), siteUrl) }
		},
		...alternates(page, siteUrl).map(({ hreflang, href }) => ({
			key: `alternate-${hreflang}`,
			tag: 'link' as const,
			attrs: { rel: 'alternate', hreflang, href }
		})),
		{
			key: 'manifest',
			tag: 'link',
			attrs: { rel: 'manifest', href: `${base}${manifestPath(locale)}` }
		},
		{
			key: 'apple-touch-icon',
			tag: 'link',
			attrs: { rel: 'apple-touch-icon', href: `${base}/${APPLE_TOUCH_ICON}` }
		},
		{ key: 'theme-color', tag: 'meta', attrs: { name: 'theme-color', content: THEME_COLOR } }
	];
}

const escapeAttr = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Serializes head tags to HTML. */
export function renderHeadTags(tags: HeadTag[]): string {
	return tags
		.map(({ key, tag, attrs }) => {
			const attributes = Object.entries({ ...attrs, 'data-pwa-seo': key })
				.map(([name, value]) => `${name}="${escapeAttr(value)}"`)
				.join(' ');
			return `<${tag} ${attributes}>`;
		})
		.join('\n\t\t');
}
