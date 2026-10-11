// Dev-only diagnostics page for the detection runtime (design D9). It is
// unlinked, never prerendered, and returns 404 outside `bun run dev`.
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = () => {
	if (!dev) error(404);
};
