import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { seoHandle } from './handle';
import { SITE_URL } from './site';

const page = '<html><head><title>x</title></head><body></body></html>';

/** Runs the handle and returns the transformed page (or the untouched one). */
async function render(pathname: string, routeId: string | null): Promise<string> {
	const event = {
		url: new URL(`http://localhost:4173${pathname}`),
		route: { id: routeId }
	} as unknown as RequestEvent;
	let options: ResolveOptions | undefined;
	const resolve = vi.fn(async (_event: RequestEvent, opts?: ResolveOptions) => {
		options = opts;
		return new Response(page);
	});
	await seoHandle({ event, resolve });
	expect(resolve).toHaveBeenCalledOnce();
	const transform = options?.transformPageChunk;
	return transform ? ((await transform({ html: page, done: true })) ?? '') : page;
}

describe('seoHandle', () => {
	it('injects the tags before </head> on a public page', async () => {
		const html = await render('/en/about', '/about');
		expect(html).toMatch(/data-pwa-seo="theme-color">\s*<\/head>/);
		expect(html).toContain(`rel="canonical" href="${SITE_URL}/en/about"`);
		expect(html.match(/rel="alternate"/g)).toHaveLength(4);
		expect(html).toContain('href="/manifest-en.webmanifest"');
	});

	it('injects the tags into a client-rendered tool shell', async () => {
		const html = await render('/es/', '/');
		expect(html).toContain(`rel="canonical" href="${SITE_URL}/es/"`);
	});

	it('skips the SPA fallback, dev-only routes and unknown paths', async () => {
		expect(await render('/en/about', null)).toBe(page);
		expect(await render('/_design', '/_design')).toBe(page);
		expect(await render('/en/unknown', '/[...rest]')).toBe(page);
	});
});
