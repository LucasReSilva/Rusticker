import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Dev-only living documentation (design-tokens D10): never prerendered,
// client-rendered only, and "not found" outside the dev server.
export const prerender = false;
export const ssr = false;

export const load: PageLoad = () => {
	if (!import.meta.env.DEV) error(404);
};
