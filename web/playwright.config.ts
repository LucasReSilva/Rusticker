import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build served like GitHub Pages
// (scripts/serve-pages.ts), under the same /Rusticker base path as the deploy.
const port = 4173;
const base = '/Rusticker';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${port}${base}/`,
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `bun run build && bun scripts/serve-pages.ts --port ${port}`,
		url: `http://localhost:${port}${base}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// VITE_E2E_HOOKS exposes window.__rusticker_e2e (see src/hooks.client.ts);
		// normal builds compile it out.
		env: { BASE_PATH: base, VITE_E2E_HOOKS: 'true' }
	}
});
