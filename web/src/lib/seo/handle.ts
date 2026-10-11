import type { Handle } from '@sveltejs/kit';
import { headTags, renderHeadTags } from './head';
import { BASE_PATH } from './site';
import { pageFromUrl } from './urls';

/**
 * Adds the SEO and install head tags to every public page while it is
 * rendered or prerendered (design D5), including the client-rendered tool
 * shells, so they are in the static HTML. The SPA fallback (no route),
 * dev-only `_` routes, non-public paths and non-HTML responses are left alone.
 */
export const seoHandle: Handle = ({ event, resolve }) => {
	const routeId = event.route.id;
	const match = pageFromUrl(event.url, BASE_PATH);
	if (routeId === null || routeId.startsWith('/_') || match === undefined) return resolve(event);

	const tags = renderHeadTags(headTags(match.page, match.locale, BASE_PATH));
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('</head>', `\t${tags}\n\t</head>`)
	});
};
