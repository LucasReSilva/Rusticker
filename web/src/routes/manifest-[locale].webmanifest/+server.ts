import { error } from '@sveltejs/kit';
import { isLocale, locales } from '$lib/paraglide/runtime';
import { buildManifest } from '$lib/seo/manifest';
import { BASE_PATH } from '$lib/seo/site';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => locales.map((locale) => ({ locale }));

export const GET: RequestHandler = ({ params }) => {
	if (!isLocale(params.locale)) error(404);
	return new Response(JSON.stringify(buildManifest(params.locale, BASE_PATH), null, '\t'), {
		headers: { 'content-type': 'application/manifest+json' }
	});
};
