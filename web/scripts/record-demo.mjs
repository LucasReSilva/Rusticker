import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Branch gate: restrict automated demo recording to main releases (or with --force)
const force = process.argv.includes('--force');
const gitBranch = (() => {
	try {
		return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return '';
	}
})();

const isMainBranch =
	gitBranch === 'main' ||
	process.env.GITHUB_REF === 'refs/heads/main' ||
	process.env.GITHUB_BASE_REF === 'main';

if (!isMainBranch && !force) {
	console.log(
		`[demo] Skipping demo recording on branch '${gitBranch}'. Demo recording is restricted to main releases to avoid dirtying git history. Use --force to run locally.`
	);
	process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, '..');
const rootDir = resolve(webDir, '..');
const assetsDir = resolve(rootDir, 'assets');
const outputGif = resolve(assetsDir, 'demo.gif');
const videoDir = resolve(__dirname, 'temp-video');

if (!existsSync(assetsDir)) {
	mkdirSync(assetsDir, { recursive: true });
}
if (existsSync(videoDir)) {
	try {
		rmSync(videoDir, { recursive: true, force: true });
	} catch {
		// ignore
	}
}
mkdirSync(videoDir, { recursive: true });

console.log('[demo] Starting static server...');
const server = spawn('bun', ['scripts/serve-pages.ts', '--port', '4173'], {
	cwd: webDir,
	env: { ...process.env, BASE_PATH: '' },
	stdio: 'pipe'
});

server.stdout.on('data', (d) => console.log(`[server] ${d.toString().trim()}`));
server.stderr.on('data', (d) => console.error(`[server err] ${d.toString().trim()}`));

// Wait for server to become responsive
async function waitForServer(url, timeoutMs = 10000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) return true;
		} catch {
			// ignore
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function record() {
	let browser;
	let context;

	try {
		await waitForServer('http://localhost:4173/en/');
		console.log('[demo] Server is ready. Launching Playwright browser...');

		browser = await chromium.launch({
			headless: true
		});

		context = await browser.newContext({
			viewport: { width: 1000, height: 680 },
			deviceScaleFactor: 1.5,
			colorScheme: 'dark',
			recordVideo: {
				dir: videoDir,
				size: { width: 1000, height: 680 }
			}
		});

		const page = await context.newPage();

		// Configure dark mode in localStorage before any script runs
		await page.addInitScript(() => {
			try {
				localStorage.setItem('mode-watcher-mode', 'dark');
			} catch {
				// ignore
			}
		});

		console.log('[demo] Navigating to http://localhost:4173/en/ (English, dark mode)...');
		await page.goto('http://localhost:4173/en/', { waitUntil: 'networkidle' });

		const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
		console.log(`[demo] Dark mode verified: ${isDark}`);

		// 1. Initial view: DropZone is idle
		console.log('[demo] Initial pause on DropZone...');
		await page.waitForTimeout(1000);

		// 2. Click "Try with sample image" button
		console.log('[demo] Clicking sample image button...');
		const sampleBtn = page.locator('[data-tool-sample-button]');
		await sampleBtn.waitFor({ state: 'visible', timeout: 5000 });
		await sampleBtn.hover();
		await page.waitForTimeout(400);
		await sampleBtn.click();

		// 3. Wait for detection to complete in English
		console.log('[demo] Waiting for sticker detection...');
		const detectedCount = page.locator('[data-detected-count]');
		await detectedCount.waitFor({ state: 'visible', timeout: 15000 });

		// Wait until processing finishes and English count ("X stickers kept") is visible
		await page.waitForFunction(
			() => {
				const el = document.querySelector('[data-detected-count]');
				if (!el || !el.textContent) return false;
				const text = el.textContent.trim();
				return (
					!text.includes('Processing') &&
					!text.includes('Processando') &&
					(text.includes('stickers kept') || text.includes('sticker kept'))
				);
			},
			{ timeout: 15000 }
		);

		console.log('[demo] Detection complete!');
		await page.waitForTimeout(1200);

		// 4. Highlight Preview and Eyedropper / Controls
		console.log('[demo] Interacting with Controls...');
		const slider = page.locator('[role="slider"]');
		if (await slider.isVisible()) {
			await slider.hover();
			await page.waitForTimeout(300);
			// Focus slider and adjust slightly
			await slider.focus();
			await page.keyboard.press('ArrowRight');
			await page.keyboard.press('ArrowRight');
			await page.waitForTimeout(800);
		}

		// 5. Scroll down to show the grid of stickers
		console.log('[demo] Hovering over grid stickers...');
		const cards = page.locator('[data-tool-grid-card]');
		const firstCard = cards.first();
		if (await firstCard.isVisible()) {
			await firstCard.hover();
			await page.waitForTimeout(600);
		}

		// 6. Scroll down to show Export region
		console.log('[demo] Scrolling to export section...');
		const exportSection = page.locator('[data-slot="export"]');
		if (await exportSection.isVisible()) {
			await exportSection.scrollIntoViewIfNeeded();
			await page.waitForTimeout(1500);
		}

		console.log('[demo] Closing browser context to flush video...');
		await context.close();
		context = null;
		await browser.close();
		browser = null;

		// Find the recorded video file
		const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
		if (!files.length) {
			throw new Error('No recorded video found in temp-video directory');
		}
		const videoFile = resolve(videoDir, files[0]);
		console.log(`[demo] Recorded video: ${videoFile}`);

		// Run ffmpeg to convert to GIF
		console.log(`[demo] Converting to GIF with ffmpeg -> ${outputGif}`);
		const ffmpegCmd = `ffmpeg -y -i "${videoFile}" -vf "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "${outputGif}"`;

		execSync(ffmpegCmd, { stdio: 'inherit' });

		console.log('[demo] GIF created successfully!');
	} finally {
		console.log('[demo] Stopping static server and cleaning up...');
		server.kill('SIGTERM');
		if (context) {
			await context.close().catch(() => {});
		}
		if (browser) {
			await browser.close().catch(() => {});
		}
		await new Promise((r) => setTimeout(r, 600));
		if (existsSync(videoDir)) {
			try {
				rmSync(videoDir, { recursive: true, force: true });
			} catch (e) {
				console.warn('[demo] Could not remove temp video dir immediately:', e.message);
			}
		}
	}
}

record().catch((err) => {
	console.error('[demo] Error:', err);
	server.kill('SIGTERM');
	process.exit(1);
});
