import type { StorybookConfig } from '@storybook/sveltekit';

process.env.PUBLIC_SITE_URL ??= 'http://localhost:6006';

const config: StorybookConfig = {
	stories: ['../src/lib/components/ui/**/*.stories.svelte'],
	addons: ['@storybook/addon-svelte-csf'],
	core: { disableTelemetry: true },
	framework: {
		name: '@storybook/sveltekit',
		options: { docgen: false }
	},
	viteFinal: async (viteConfig) => ({
		...viteConfig,
		build: { ...viteConfig.build, chunkSizeWarningLimit: 1000 }
	})
};

export default config;
