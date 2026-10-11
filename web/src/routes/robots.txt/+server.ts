import { buildRobots } from '$lib/seo/sitemap';
import type { RequestHandler } from './$types';

export const prerender = true;

// Nothing links here, so the prerender crawler needs an explicit entry.
export const entries = (): Array<Record<string, never>> => [{}];

export const GET: RequestHandler = () =>
	new Response(buildRobots(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
