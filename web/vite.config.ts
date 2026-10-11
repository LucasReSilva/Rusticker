import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig, type Plugin } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { buildUrlPatterns } from './src/lib/i18n/routes.js';
import { FALLBACK_PAGE, precacheTransform } from './src/lib/pwa/precache.ts';

// --- pwa-seo ---
// Installable offline app and SEO site constants (openspec change pwa-seo,
// design D1, D2, D7). Absolute URLs come from PUBLIC_SITE_URL, which already
// includes the base path (e.g. https://example.github.io/Rusticker).
const pwaBase = process.env.BASE_PATH ?? '';
const siteUrlFromEnv = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '');
const siteUrl = siteUrlFromEnv || `http://localhost:4173${pwaBase}`;
const escapedBase = pwaBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const siteUrlWarning: Plugin = {
	name: 'pwa-seo:site-url',
	apply: 'build',
	configResolved() {
		// The config is loaded several times per build: warn once per process.
		if (siteUrlFromEnv || process.env.PWA_SEO_SITE_URL_WARNED) return;
		process.env.PWA_SEO_SITE_URL_WARNED = '1';
		console.warn(
			`[pwa-seo] PUBLIC_SITE_URL is not set: canonical links, the sitemap and robots.txt use "${siteUrl}" and are not production-ready.`
		);
	}
};

const pwaSeoDefine = {
	__SITE_URL__: JSON.stringify(siteUrl),
	__BASE_PATH__: JSON.stringify(pwaBase)
};

const pwaSeoPlugins = [
	siteUrlWarning,
	SvelteKitPWA({
		strategies: 'generateSW',
		// Updates wait until every app window is closed (design D2).
		registerType: 'prompt',
		// Registered by src/lib/pwa/PwaRegistration.svelte.
		injectRegister: false,
		// Per-locale manifests come from src/routes/manifest-[locale].webmanifest.
		manifest: false,
		base: `${pwaBase}/`,
		scope: `${pwaBase}/`,
		devOptions: { enabled: false },
		kit: { base: `${pwaBase}/`, adapterFallback: FALLBACK_PAGE },
		workbox: {
			// A pattern with no match (e.g. no .wasm yet) only logs a warning.
			globPatterns: [
				'client/**/*.{js,css,ico,png,svg,webp,woff2,wasm,webmanifest}',
				'prerendered/**/*.{html,webmanifest}'
			],
			// Dev-only `_` pages (`client/_app` is the app itself), and files that
			// are not part of the app.
			globIgnores: [
				'server/**',
				'prerendered/**/_*/**',
				'prerendered/**/_*.html',
				'**/sitemap.xml',
				'**/robots.txt'
			],
			// The default (2 MiB) would silently skip a large .wasm.
			maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
			manifestTransforms: [precacheTransform(`${import.meta.dirname}/.svelte-kit/output`)],
			navigateFallback: `${pwaBase}/${FALLBACK_PAGE}`,
			navigateFallbackAllowlist: [new RegExp(`^${escapedBase}/`)],
			navigateFallbackDenylist: [
				/\/sitemap\.xml$/,
				/\/robots\.txt$/,
				/\.webmanifest$/,
				new RegExp(`^${escapedBase}/_`)
			]
		}
	})
];
// --- /pwa-seo ---

export default defineConfig({
	define: pwaSeoDefine,
	plugins: [
		tailwindcss(),
		sveltekit(),
		// paraglide: the locale comes only from the URL (translated slugs, see
		// src/lib/i18n/routes.js). The saved preference is handled by
		// src/lib/i18n (entry redirect): Paraglide's localStorage strategy would
		// overwrite it whenever a prefixed URL is visited.
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['url', 'baseLocale'],
			urlPatterns: buildUrlPatterns(process.env.BASE_PATH ?? '')
		}),
		// /paraglide
		...pwaSeoPlugins
	],
	// --- wasm-worker: detection worker + wasm (owned by change wasm-worker) ---
	// Module worker, matching `new Worker(..., { type: 'module' })`.
	worker: { format: 'es' },
	// Keep the wasm-bindgen glue un-prebundled in dev; the binary itself is
	// loaded through a `?url` import (see src/lib/detection/worker.ts).
	optimizeDeps: { exclude: ['rusticker-core'] },
	// --- end wasm-worker ---
	test: {
		expect: { requireAssertions: true },
		// Two fixed projects. Later changes only add test files that follow
		// these naming rules; they never edit this block.
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.ts'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				resolve: { conditions: ['browser'] },
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			}
		]
	}
});
