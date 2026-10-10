import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { buildUrlPatterns } from './src/lib/i18n/routes.js';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// paraglide: locale comes from the URL (translated slugs, see
		// src/lib/i18n/routes.js), then the saved preference, then pt-BR.
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['url', 'localStorage', 'baseLocale'],
			urlPatterns: buildUrlPatterns(process.env.BASE_PATH ?? '')
		})
		// /paraglide
	],
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
