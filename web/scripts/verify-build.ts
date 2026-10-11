// Build-output verification (design D8). Run after `bun run build` with the
// same BASE_PATH: `BASE_PATH=/Rusticker bun run verify:build`.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, pageIds, routeLocales } from '../src/lib/i18n/routes.js';

/** The file a base-relative path is served from (GitHub Pages rules). */
export function fileForPath(path: string): string {
	if (path === '/' || path.endsWith('/')) return `${path.slice(1)}index.html`;
	return `${path.slice(1)}.html`;
}

/** Root-relative `href`/`src` values in an HTML document. */
export function rootRelativeUrls(html: string): string[] {
	return [...html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)].map((match) => match[1]);
}

const decode = (text: string) =>
	text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

/** Whether a URL path under the base resolves to a file in the build. */
function existsInBuild(buildDir: string, path: string): boolean {
	const clean = path.split(/[?#]/)[0];
	const candidates = clean.endsWith('/')
		? [join(clean, 'index.html')]
		: [clean, `${clean}.html`, join(clean, 'index.html')];
	return candidates.some((candidate) => {
		const file = join(buildDir, candidate);
		return existsSync(file) && statSync(file).isFile();
	});
}

const headingKey = { howToUse: 'page_how_to_use_heading', about: 'page_about_heading' } as const;

/** Checks a build directory and returns one message per failed assertion. */
export function verifyBuild(webDir: string, base: string): string[] {
	const buildDir = join(webDir, 'build');
	const errors: string[] = [];
	const documents: Array<{ file: string; locale: string; heading?: string }> = [];

	for (const id of pageIds) {
		for (const locale of routeLocales) {
			const catalog = JSON.parse(
				readFileSync(join(webDir, 'messages', `${locale}.json`), 'utf8')
			) as Record<string, string>;
			documents.push({
				file: fileForPath(pages[id][locale]),
				locale,
				heading: id === 'tool' ? undefined : catalog[headingKey[id]]
			});
		}
	}
	documents.push({ file: '404.html', locale: 'pt-BR' });

	for (const { file, locale, heading } of documents) {
		const path = join(buildDir, file);
		if (!existsSync(path)) {
			errors.push(`${file}: missing`);
			continue;
		}
		const html = readFileSync(path, 'utf8');
		const lang = html.match(/<html[^>]*\slang="([^"]*)"/)?.[1];
		if (lang !== locale) errors.push(`${file}: lang is "${lang}", expected "${locale}"`);
		if (heading !== undefined) {
			const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
			if (h1 === undefined || decode(h1.replace(/<[^>]*>/g, '')).trim() !== heading) {
				errors.push(`${file}: heading is "${h1}", expected "${heading}"`);
			}
		}
		for (const url of rootRelativeUrls(html)) {
			if (base !== '' && url !== base && !url.startsWith(`${base}/`)) {
				errors.push(`${file}: "${url}" does not start with BASE_PATH "${base}"`);
			} else if (!existsInBuild(buildDir, url.slice(base.length) || '/')) {
				errors.push(`${file}: "${url}" does not resolve under BASE_PATH "${base}"`);
			}
		}
	}
	return errors;
}

if (import.meta.main) {
	const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const base = process.env.BASE_PATH ?? '';
	const errors = verifyBuild(webDir, base);
	for (const error of errors) console.error(error);
	if (errors.length > 0) {
		console.error(`verify:build failed with ${errors.length} problem(s) (BASE_PATH="${base}").`);
		process.exit(1);
	}
	console.log(`verify:build passed (BASE_PATH="${base}").`);
}
