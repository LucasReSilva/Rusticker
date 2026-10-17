import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = process.env.BENCH_BASE_URL ?? 'http://127.0.0.1:4179';
const chromePath = process.env.CHROME_PATH;
const rounds = Number(process.env.BENCH_ROUNDS ?? 5);
const variants = ['css', 'svg', 'dotlottie'];

if (!chromePath) throw new Error('Set CHROME_PATH to the Chromium or Chrome executable.');
if (!Number.isInteger(rounds) || rounds < 1) throw new Error('BENCH_ROUNDS must be a positive integer.');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unusedPort() {
	const server = createServer();
	await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
	const { port } = server.address();
	await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	return port;
}

class DevTools {
	#socket;
	#nextId = 0;
	#pending = new Map();
	#events = [];

	constructor(url) {
		this.#socket = new WebSocket(url);
		this.ready = new Promise((resolve, reject) => {
			this.#socket.addEventListener('open', resolve, { once: true });
			this.#socket.addEventListener('error', reject, { once: true });
		});
		this.#socket.addEventListener('message', ({ data }) => {
			const message = JSON.parse(data);
			if (message.id !== undefined) {
				const pending = this.#pending.get(message.id);
				if (!pending) return;
				this.#pending.delete(message.id);
				if (message.error) pending.reject(new Error(message.error.message));
				else pending.resolve(message.result);
			} else this.#events.push(message);
		});
	}

	send(method, params = {}, sessionId) {
		const id = ++this.#nextId;
		const promise = new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
		this.#socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
		return promise;
	}

	async waitForEvent(method, sessionId, timeout = 15000) {
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			const index = this.#events.findIndex((event) => event.method === method && event.sessionId === sessionId);
			if (index >= 0) return this.#events.splice(index, 1)[0].params;
			await delay(10);
		}
		throw new Error(`Timed out waiting for ${method}`);
	}

	close() {
		this.#socket.close();
	}
}

async function waitForDevTools(port, browser) {
	const endpoint = `http://127.0.0.1:${port}/json/version`;
	for (let attempt = 0; attempt < 100; attempt++) {
		if (browser.exitCode !== null) throw new Error(`Browser exited with code ${browser.exitCode}`);
		try {
			const response = await fetch(endpoint);
			if (response.ok) return (await response.json()).webSocketDebuggerUrl;
		} catch {}
		await delay(100);
	}
	throw new Error('Timed out waiting for Chromium DevTools endpoint.');
}

async function evaluate(cdp, sessionId, expression) {
	const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
		expression,
		returnByValue: true,
		awaitPromise: true
	}, sessionId);
	if (exceptionDetails) throw new Error(exceptionDetails.text);
	return result.value;
}

const port = await unusedPort();
const profile = await mkdtemp(join(tmpdir(), 'rusticker-lottie-benchmark-'));
const browser = Bun.spawn([
	chromePath,
	'--headless',
	'--no-sandbox',
	'--disable-gpu',
	'--disable-dev-shm-usage',
	'--disable-background-networking',
	'--disable-extensions',
	'--disable-default-apps',
	'--disable-sync',
	'--no-first-run',
	'--no-default-browser-check',
	'--remote-allow-origins=*',
	`--remote-debugging-port=${port}`,
	`--user-data-dir=${profile}`,
	'--host-resolver-rules=MAP * ~NOTFOUND,EXCLUDE 127.0.0.1',
	'about:blank'
], { stdout: 'ignore', stderr: 'ignore' });

const cdp = new DevTools(await waitForDevTools(port, browser));
await cdp.ready;
const browserVersion = await cdp.send('Browser.getVersion');

const results = [];
try {
	for (let round = 0; round < rounds; round++) {
		const ordered = variants.map((_, index) => variants[(index + round) % variants.length]);
		for (const variant of ordered) {
			const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
			const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
			const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
			try {
				await cdp.send('Page.enable', {}, sessionId);
				await cdp.send('Runtime.enable', {}, sessionId);
				await cdp.send('Network.enable', {}, sessionId);
				await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
				await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
					source: `window.__benchLongTasks = []; if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver((list) => window.__benchLongTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration })))).observe({ type: 'longtask', buffered: true });`
				}, sessionId);
				const loadEvent = cdp.waitForEvent('Page.loadEventFired', sessionId);
				await cdp.send('Page.navigate', { url: `${baseUrl}/${variant}.html` }, sessionId);
				await loadEvent;
				const data = await evaluate(cdp, sessionId, `(async () => {
					const hasFcp = () => performance.getEntriesByName('first-contentful-paint').length > 0;
					if (!hasFcp()) await new Promise((resolve) => {
						const observer = new PerformanceObserver((list) => {
							if (list.getEntries().some((entry) => entry.name === 'first-contentful-paint')) {
								observer.disconnect();
							resolve();
							}
						});
						observer.observe({ type: 'paint', buffered: true });
						setTimeout(() => { observer.disconnect(); resolve(); }, 10000);
					});
					const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
					return { fcpMs: fcp, readyState: document.readyState, externalResourceCount: performance.getEntriesByType('resource').filter((entry) => new URL(entry.name).origin !== location.origin).length, resourceBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0) };
				})()`);
				const timing = data.fcpMs === null ? { tbtMs: null, windowMs: null } : await evaluate(cdp, sessionId, `(async () => {
					const tasks = window.__benchLongTasks ?? [];
					const navigation = performance.getEntriesByType('navigation')[0];
					let quietStart = Math.max(${data.fcpMs}, navigation?.loadEventEnd ?? 0);
					for (let attempt = 0; attempt < 10; attempt++) {
						await new Promise((resolve) => setTimeout(resolve, Math.max(0, quietStart + 5000 - performance.now())));
						const lastTaskEnd = tasks.filter(({ startTime }) => startTime >= ${data.fcpMs}).reduce((end, task) => Math.max(end, task.startTime + task.duration), quietStart);
						if (lastTaskEnd <= quietStart) break;
						quietStart = lastTaskEnd;
					}
					const ttiMs = quietStart + 5000;
					const tbtMs = tasks.filter(({ startTime }) => startTime >= ${data.fcpMs} && startTime < ttiMs).reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
					return { tbtMs, windowMs: ttiMs - ${data.fcpMs}, ttiMs };
				})()`);
				results.push({ round: round + 1, variant, ...data, ...timing });
			} finally {
				await cdp.send('Target.closeTarget', { targetId });
				await cdp.send('Target.disposeBrowserContext', { browserContextId });
			}
		}
	}
} finally {
	cdp.close();
	browser.kill();
	await browser.exited;
	await rm(profile, { recursive: true, force: true });
}

const median = (values) => {
	const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
	if (!sorted.length) return null;
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summary = Object.fromEntries(variants.map((variant) => {
	const samples = results.filter((sample) => sample.variant === variant);
	return [variant, {
		n: samples.length,
		fcpMedianMs: median(samples.map(({ fcpMs }) => fcpMs)),
		tbtMedianMs: median(samples.map(({ tbtMs }) => tbtMs)),
		fcpMs: samples.map(({ fcpMs }) => fcpMs),
		tbtMs: samples.map(({ tbtMs }) => tbtMs),
		externalResourceCount: samples.map(({ externalResourceCount }) => externalResourceCount)
	}];
}));

console.log(JSON.stringify({ browser: browserVersion.product, rounds, baseUrl, tbtWindow: 'From FCP through the end of the first 5-second CPU-quiet window starting no earlier than loadEventEnd; sum of max(0, long-task duration - 50ms)', results, summary }, null, 2));
