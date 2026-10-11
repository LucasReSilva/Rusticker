// Maps Workbox's glob results over `.svelte-kit/output` to the URLs the site
// is served at (design D1). Imported by vite.config.ts, so it must not use
// `$lib` aliases or SvelteKit modules.
//
// The plugin's own transform applies one `trailingSlash` setting to every
// page, but this site mixes them: tool shells live at `<locale>/index.html`
// and are served at `<locale>/`, content pages at `x.html` and served at `x`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PrecacheEntry = { url: string; revision: string | null; size: number };

/** The adapter's SPA fallback, written to `build/` by adapter-static. */
export const FALLBACK_PAGE = '404.html';

/**
 * The served URL of a build file, relative to the service worker (which lives
 * at the base path): `index.html` -> `./`, `en/index.html` -> `en/`,
 * `en/about.html` -> `en/about`; other files keep their path.
 */
export function servedUrl(file: string): string {
	let url = file.replace(/^(client|prerendered\/pages|prerendered\/dependencies)\//, '');
	if (url === 'index.html') return './';
	if (url.endsWith('/index.html')) return url.slice(0, -'index.html'.length);
	if (url.endsWith('.html') && url !== FALLBACK_PAGE) url = url.slice(0, -'.html'.length);
	return url;
}

/**
 * A Workbox `manifestTransforms` entry: rewrites URLs with {@link servedUrl}
 * and adds the SPA fallback page, which the adapter writes outside the glob
 * directory. Its revision follows the app version, so it changes with every
 * build that changes the app.
 */
export function precacheTransform(outputDir: string) {
	return async (entries: PrecacheEntry[]) => {
		const manifest = entries.map((entry) => ({ ...entry, url: servedUrl(entry.url) }));
		const version = readFileSync(join(outputDir, 'client', '_app', 'version.json'));
		manifest.push({
			url: FALLBACK_PAGE,
			revision: createHash('md5').update(version).digest('hex'),
			size: 0
		});
		return { manifest, warnings: [] };
	};
}
