import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

// Two fixed projects, so later changes only add spec files:
// - `pages`: the production build served like GitHub Pages
//   (scripts/serve-pages.ts) under the deploy's /Rusticker base path;
// - `dev`: `*.dev.spec.ts` files against the Vite dev server, for dev-only
//   routes such as /_design and /_detection that are never built.
const pagesPort = 4173;
const devPort = 5173;
const base = '/Rusticker';

/** Values of every `--project` / `--project=` CLI argument. */
function selectedProjects(argv: string[]): string[] {
	return argv.flatMap((arg, index) => {
		if (arg.startsWith('--project=')) return [arg.slice('--project='.length)];
		if (arg === '--project' && argv[index + 1]) return [argv[index + 1]];
		return [];
	});
}

const projects = selectedProjects(process.argv);
const wants = (name: string) => projects.length === 0 || projects.includes(name);

// The servers start one after the other, in this order, so the dev server's
// Paraglide compile (empty base path) never overlaps the /Rusticker build.
const webServer: NonNullable<PlaywrightTestConfig['webServer']> = [];
if (wants('pages')) {
	webServer.push({
		command: `bun run build && bun scripts/serve-pages.ts --port ${pagesPort}`,
		url: `http://localhost:${pagesPort}${base}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		// VITE_E2E_HOOKS exposes window.__rusticker_e2e (see src/hooks.client.ts);
		// normal builds compile it out.
		env: { BASE_PATH: base, VITE_E2E_HOOKS: 'true' }
	});
}
if (wants('dev')) {
	webServer.push({
		command: `bun run dev --port ${devPort} --strictPort`,
		url: `http://localhost:${devPort}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: { BASE_PATH: '' }
	});
}

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: { trace: 'on-first-retry' },
	projects: [
		{
			name: 'pages',
			testIgnore: '**/*.dev.spec.ts',
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${pagesPort}${base}/` }
		},
		{
			name: 'dev',
			testMatch: '**/*.dev.spec.ts',
			use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${devPort}/` }
		}
	],
	webServer
});
