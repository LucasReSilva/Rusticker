// Build-output check for search discoverability and offline install (openspec
// change pwa-seo, design D10). Run after `bun run build` with the same
// variables: `BASE_PATH=/Rusticker PUBLIC_SITE_URL=... bun run seo:check`.
// Without PUBLIC_SITE_URL it expects the build's localhost fallback.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseLocale, pageIds, pages, routeLocales } from '../src/lib/i18n/routes.js';

const MANIFEST_TEXTS = { name: 'pwa_name', short_name: 'pwa_short_name' } as const;

/** Whether a served path points to a private SvelteKit route or page. */
export function isDevOnlyPath(path: string): boolean {
	const segments = path.split('/').filter(Boolean);
	if (segments[0] === '_app') return false;
	return segments.some((segment) => segment.startsWith('_'));
}

/** The file a base-relative page path is served from (GitHub Pages rules). */
function fileForPath(path: string): string {
	return path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`;
}

/** Attribute values of every `<link>` in an HTML document's head. */
function headLinks(html: string): Array<Record<string, string>> {
	const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? '';
	return [...head.matchAll(/<link\b([^>]*)>/g)].map((match) =>
		Object.fromEntries(
			[...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])
		)
	);
}

/** Every file under a directory, as `/`-separated paths relative to it. */
function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path).map((child) => `${name}/${child}`) : [name];
	});
}

/** Checks a build directory; returns one message per violation. */
export function seoCheck(webDir: string, base: string, siteUrl: string): string[] {
	const buildDir = join(webDir, 'build');
	const errors: string[] = [];
	const read = (file: string) => readFileSync(join(buildDir, file), 'utf8');
	const has = (file: string) => existsSync(join(buildDir, file));
	const absolute = (path: string) => `${siteUrl}${path}`;
	const isDevPath = (url: string) =>
		isDevOnlyPath(url.replace(/^https?:\/\/[^/]+/, '').slice(base.length));

	// 1-2. Every page document, with canonical, alternates and its manifest.
	for (const id of pageIds) {
		const expected = new Map<string, string>([
			...routeLocales.map((locale) => [locale, absolute(pages[id][locale])] as const),
			['x-default', absolute(pages[id][baseLocale])]
		]);
		for (const locale of routeLocales) {
			const file = fileForPath(pages[id][locale]);
			if (!has(file)) {
				errors.push(`${file}: page document missing`);
				continue;
			}
			const links = headLinks(read(file));
			const canonical = links.filter((link) => link.rel === 'canonical');
			if (canonical.length !== 1) {
				errors.push(`${file}: expected 1 canonical link, found ${canonical.length}`);
			} else if (canonical[0].href !== absolute(pages[id][locale])) {
				errors.push(
					`${file}: canonical is "${canonical[0].href}", expected "${absolute(pages[id][locale])}"`
				);
			}
			const alternates = links.filter((link) => link.rel === 'alternate' && link.hreflang);
			for (const [hreflang, href] of expected) {
				const found = alternates.filter((link) => link.hreflang === hreflang);
				if (found.length === 0) errors.push(`${file}: missing alternate for "${hreflang}"`);
				else if (found.length > 1) errors.push(`${file}: duplicate alternate for "${hreflang}"`);
				else if (found[0].href !== href) {
					errors.push(`${file}: alternate "${hreflang}" is "${found[0].href}", expected "${href}"`);
				}
			}
			for (const link of alternates) {
				if (!expected.has(link.hreflang)) {
					errors.push(`${file}: unexpected alternate "${link.hreflang}"`);
				}
			}
			for (const link of [...canonical, ...alternates]) {
				if (isDevPath(link.href)) errors.push(`${file}: link to dev-only path "${link.href}"`);
			}
			const manifest = links.filter((link) => link.rel === 'manifest');
			const manifestHref = `${base}/manifest-${locale}.webmanifest`;
			if (manifest.length !== 1 || manifest[0].href !== manifestHref) {
				errors.push(`${file}: expected one manifest link to "${manifestHref}"`);
			}
		}
	}

	// 3. sitemap.xml and robots.txt.
	if (!has('sitemap.xml')) {
		errors.push('sitemap.xml: missing');
	} else {
		const xml = read('sitemap.xml');
		const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
		const expectedLocs = pageIds.flatMap((id) =>
			routeLocales.map((locale) => absolute(pages[id][locale]))
		);
		if (entries.length !== expectedLocs.length) {
			errors.push(`sitemap.xml: ${entries.length} <url> entries, expected ${expectedLocs.length}`);
		}
		const locs = entries.map((entry) => entry.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? '');
		for (const loc of expectedLocs) {
			if (!locs.includes(loc)) errors.push(`sitemap.xml: missing <loc> ${loc}`);
		}
		entries.forEach((entry, index) => {
			const langs = [...entry.matchAll(/hreflang="([^"]*)"/g)].map((match) => match[1]);
			for (const lang of [...routeLocales, 'x-default']) {
				if (!langs.includes(lang)) {
					errors.push(`sitemap.xml: ${locs[index]} lacks the "${lang}" alternate`);
				}
			}
		});
		for (const url of xml.matchAll(/(?:<loc>|href=")([^<"]*)/g)) {
			if (isDevPath(url[1])) errors.push(`sitemap.xml: lists dev-only path "${url[1]}"`);
		}
	}
	if (!has('robots.txt')) {
		errors.push('robots.txt: missing');
	} else if (!read('robots.txt').includes(`Sitemap: ${absolute('/sitemap.xml')}`)) {
		errors.push(`robots.txt: missing "Sitemap: ${absolute('/sitemap.xml')}"`);
	}

	// 4. Manifests: localized, same identity and scope, icons present.
	const identities = new Set<string>();
	for (const locale of routeLocales) {
		const file = `manifest-${locale}.webmanifest`;
		if (!has(file)) {
			errors.push(`${file}: missing`);
			continue;
		}
		let manifest: Record<string, unknown>;
		try {
			manifest = JSON.parse(read(file));
		} catch {
			errors.push(`${file}: not valid JSON`);
			continue;
		}
		const catalog = JSON.parse(
			readFileSync(join(webDir, 'messages', `${locale}.json`), 'utf8')
		) as Record<string, string>;
		for (const [field, key] of Object.entries(MANIFEST_TEXTS)) {
			if (manifest[field] !== catalog[key]) {
				errors.push(`${file}: ${field} is "${manifest[field]}", expected "${catalog[key]}"`);
			}
		}
		if (manifest.lang !== locale) errors.push(`${file}: lang is "${manifest.lang}"`);
		const startUrl = `${base}${pages.tool[locale]}`;
		if (manifest.start_url !== startUrl) {
			errors.push(`${file}: start_url is "${manifest.start_url}", expected "${startUrl}"`);
		}
		if (manifest.scope !== `${base}/`) errors.push(`${file}: scope is "${manifest.scope}"`);
		identities.add(`${manifest.id} ${manifest.scope}`);
		const icons = (manifest.icons ?? []) as Array<{ src: string; sizes: string; purpose?: string }>;
		for (const size of ['192x192', '512x512']) {
			if (!icons.some((icon) => icon.sizes === size)) errors.push(`${file}: no ${size} icon`);
		}
		if (!icons.some((icon) => icon.purpose?.split(' ').includes('maskable'))) {
			errors.push(`${file}: no maskable icon`);
		}
		for (const icon of icons) {
			if (!icon.src.startsWith(`${base}/`) || !has(icon.src.slice(base.length + 1))) {
				errors.push(`${file}: icon "${icon.src}" is not in the build under "${base}/"`);
			}
		}
	}
	if (identities.size > 1)
		errors.push(`manifests: id/scope differ (${[...identities].join(', ')})`);

	// 5. Service worker precache list.
	if (!has('sw.js')) {
		errors.push('sw.js: missing');
	} else {
		const precached = new Set(
			[...read('sw.js').matchAll(/\burl:\s*"([^"]*)"/g)].map((match) =>
				new URL(match[1], `http://sw.test${base}/`).pathname.slice(base.length)
			)
		);
		const required = [
			...pageIds.flatMap((id) => routeLocales.map((locale) => pages[id][locale])),
			'/404.html',
			...routeLocales.map((locale) => `/manifest-${locale}.webmanifest`),
			...walk(buildDir)
				.filter((file) => file.endsWith('.wasm'))
				.map((file) => `/${file}`)
		];
		for (const path of required) {
			if (!precached.has(path)) errors.push(`sw.js: "${path}" is not precached`);
		}
		for (const path of precached) {
			if (/\/_(?!app\/)/.test(path)) errors.push(`sw.js: precaches dev-only path "${path}"`);
		}
	}

	return errors;
}

if (import.meta.main) {
	const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const base = process.env.BASE_PATH ?? '';
	const errors: string[] = [];
	let siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '');
	if (!siteUrl) {
		// Without PUBLIC_SITE_URL, take the origin the build used (its root
		// canonical), which must end with BASE_PATH; every other URL is then
		// checked against it.
		const index = join(webDir, 'build', 'index.html');
		const canonical = existsSync(index)
			? headLinks(readFileSync(index, 'utf8')).find((link) => link.rel === 'canonical')?.href
			: undefined;
		siteUrl = (canonical ?? `http://localhost:4173${base}/`).replace(/\/+$/, '');
		if (
			!/^https?:\/\/[^/]+/.test(siteUrl) ||
			new URL(siteUrl).pathname.replace(/\/$/, '') !== base
		) {
			errors.push(`index.html: canonical "${canonical}" is not absolute under BASE_PATH "${base}"`);
		}
		console.log(`PUBLIC_SITE_URL is not set; checking against the build's site "${siteUrl}".`);
	}
	errors.push(...seoCheck(webDir, base, siteUrl));
	for (const error of errors) console.error(error);
	if (errors.length > 0) {
		console.error(`seo:check failed with ${errors.length} problem(s) (site "${siteUrl}").`);
		process.exit(1);
	}
	const wasm = walk(join(webDir, 'build')).filter((file) => file.endsWith('.wasm')).length;
	console.log(
		`seo:check passed: ${pageIds.length * routeLocales.length} pages, sitemap, robots, 3 manifests and the precache list (${wasm} .wasm) are valid for "${siteUrl}" (${relative(process.cwd(), join(webDir, 'build')) || '.'}).`
	);
}
