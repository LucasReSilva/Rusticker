import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Reads the deploy sub-path from `BASE_PATH`. It must be empty (served from
 * the domain root) or start with `/` and not end with `/`, e.g. `/Rusticker`.
 * Anything else fails the build instead of producing broken links.
 * @returns {'' | `/${string}`}
 */
function readBasePath() {
	const value = process.env.BASE_PATH ?? '';
	if (value === '') return '';
	if (!value.startsWith('/') || value.endsWith('/')) {
		throw new Error(
			`Invalid BASE_PATH "${value}": it must be empty or start with "/" and not end with "/" (for example "/Rusticker").`
		);
	}
	return /** @type {`/${string}`} */ (value);
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			strict: true
		}),
		paths: {
			base: readBasePath()
		},
		prerender: {
			handleHttpError: 'fail',
			handleMissingId: 'fail'
		}
	}
};

export default config;
