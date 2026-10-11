// Serves web/build the way GitHub Pages does, for the e2e tests:
// - everything lives under BASE_PATH (default /Rusticker);
// - /x is served from x.html, /x/ from x/index.html;
// - /x, when x is a directory with an index.html, redirects to /x/;
// - anything else gets 404.html with status 404 (the SPA fallback).
// Usage: bun scripts/serve-pages.ts [--port 4173] [--root build]
import { existsSync, statSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(webDir, option('root', 'build'));
const base = process.env.BASE_PATH ?? '/Rusticker';
const port = Number(option('port', '4173'));

const isFile = (path: string) => existsSync(path) && statSync(path).isFile();
const isDir = (path: string) => existsSync(path) && statSync(path).isDirectory();

const server = Bun.serve({
	port,
	fetch(request) {
		const url = new URL(request.url);
		const pathname = decodeURIComponent(url.pathname);
		const notFound = () =>
			new Response(Bun.file(join(root, '404.html')), {
				status: 404,
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});

		if (pathname !== base && !pathname.startsWith(`${base}/`)) return notFound();
		const path = pathname.slice(base.length) || '/';
		const disk = normalize(join(root, path));
		if (!disk.startsWith(root)) return notFound();

		if (path.endsWith('/')) {
			const index = join(disk, 'index.html');
			return isFile(index) ? new Response(Bun.file(index)) : notFound();
		}
		if (isFile(disk)) return new Response(Bun.file(disk));
		if (isDir(disk) && isFile(join(disk, 'index.html'))) {
			return Response.redirect(`${url.origin}${base}${path}/${url.search}`, 301);
		}
		if (isFile(`${disk}.html`)) return new Response(Bun.file(`${disk}.html`));
		return notFound();
	}
});

console.log(`Serving ${root} at http://localhost:${server.port}${base}/`);
