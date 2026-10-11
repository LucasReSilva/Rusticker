// sitemap.xml and robots.txt (design D8), built from the public page table.
import { locales } from '$lib/paraglide/runtime';
import { SITE_URL } from './site';
import { PUBLIC_PAGES, absoluteUrl, alternates, localizedPath } from './urls';

const escapeXml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A sitemap with one `<url>` per page and locale, each declaring the page's
 * language alternates and `x-default` (Google's `xhtml:link` extension).
 */
export function buildSitemap(siteUrl: string = SITE_URL): string {
	const urls = PUBLIC_PAGES.flatMap((page) => {
		const links = alternates(page, siteUrl)
			.map(
				({ hreflang, href }) =>
					`\t\t<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`
			)
			.join('\n');
		return locales.map(
			(locale) =>
				`\t<url>\n\t\t<loc>${escapeXml(absoluteUrl(localizedPath(page, locale), siteUrl))}</loc>\n${links}\n\t</url>`
		);
	});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...urls,
		'</urlset>',
		''
	].join('\n');
}

/** robots.txt: allow everything and point to the absolute sitemap URL. */
export function buildRobots(siteUrl: string = SITE_URL): string {
	return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml', siteUrl)}\n`;
}
