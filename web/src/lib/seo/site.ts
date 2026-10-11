// Build-time site constants, injected by the `// --- pwa-seo ---` block of
// vite.config.ts (design D7). They are plain strings so they also work while
// prerendering, where `$env/dynamic/public` is not available.

declare const __SITE_URL__: string;
declare const __BASE_PATH__: string;

/** Strips trailing slashes, so paths can be appended with a leading `/`. */
export function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

/**
 * The public site URL including the deploy base path and without a trailing
 * slash, e.g. `https://example.github.io/Rusticker`.
 */
export const SITE_URL: string = trimTrailingSlash(
	typeof __SITE_URL__ === 'string' ? __SITE_URL__ : 'http://localhost:4173'
);

/** The deploy base path (`''` or e.g. `/Rusticker`), without a trailing slash. */
export const BASE_PATH: string = trimTrailingSlash(
	typeof __BASE_PATH__ === 'string' ? __BASE_PATH__ : ''
);
