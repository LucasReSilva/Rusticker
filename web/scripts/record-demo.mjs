import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

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
	rmSync(videoDir, { recursive: true, force: true });
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
	try {
		await waitForServer('http://localhost:4173/');
		console.log('[demo] Server is ready. Launching Playwright browser...');

		const browser = await chromium.launch({
			headless: true
		});

		const context = await browser.newContext({
			viewport: { width: 1000, height: 680 },
			deviceScaleFactor: 1.5,
			recordVideo: {
				dir: videoDir,
				size: { width: 1000, height: 680 }
			}
		});

		const page = await context.newPage();
		console.log('[demo] Navigating to http://localhost:4173/ ...');
		await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

		// 1. Initial view: DropZone is idle
		console.log('[demo] Initial pause on DropZone...');
		await page.waitForTimeout(1000);

		// 2. Click "Try with sample image" ("Testar com exemplo")
		console.log('[demo] Clicking sample image button...');
		const sampleBtn = page.locator('[data-tool-sample-button]');
		await sampleBtn.waitFor({ state: 'visible', timeout: 5000 });
		await sampleBtn.hover();
		await page.waitForTimeout(400);
		await sampleBtn.click();

		// 3. Wait for detection to complete
		console.log('[demo] Waiting for sticker detection...');
		const detectedCount = page.locator('[data-detected-count]');
		await detectedCount.waitFor({ state: 'visible', timeout: 15000 });
		// Wait until processing finishes
		await page.waitForFunction(
			() => {
				const el = document.querySelector('[data-detected-count]');
				return el && el.textContent && !el.textContent.includes('Processando');
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

		// 5. Scroll down to show the grid of stickers and export
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
		await browser.close();

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

		const { execSync } = await import('node:child_process');
		execSync(ffmpegCmd, { stdio: 'inherit' });

		console.log('[demo] GIF created successfully!');
	} finally {
		console.log('[demo] Stopping static server...');
		server.kill('SIGTERM');
		if (existsSync(videoDir)) {
			rmSync(videoDir, { recursive: true, force: true });
		}
	}
}

record().catch((err) => {
	console.error('[demo] Error:', err);
	server.kill('SIGTERM');
	process.exit(1);
});
