import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { buildUrlPatterns } from './src/lib/i18n/routes.js';

export default defineConfig({
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
		})
		// /paraglide
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
