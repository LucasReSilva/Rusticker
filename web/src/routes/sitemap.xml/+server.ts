import { buildSitemap } from '$lib/seo/sitemap';
import type { RequestHandler } from './$types';

export const prerender = true;

// Nothing links here, so the prerender crawler needs an explicit entry.
export const entries = (): Array<Record<string, never>> => [{}];

export const GET: RequestHandler = () =>
	new Response(buildSitemap(), { headers: { 'content-type': 'application/xml' } });
