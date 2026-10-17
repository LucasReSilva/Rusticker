// The e2e build has no PUBLIC_SITE_URL, so absolute URLs use the localhost
// fallback, which is also where scripts/serve-pages.ts serves it.
export const base = '/Rusticker';
export const site = `http://localhost:4173${base}`;

/** The 15 public URLs (base-relative), per page and locale. */
export const urls = {
	tool: { 'pt-BR': '/', en: '/en/', es: '/es/' },
	howToUse: { 'pt-BR': '/como-usar', en: '/en/how-to-use', es: '/es/como-usar' },
	about: { 'pt-BR': '/sobre', en: '/en/about', es: '/es/acerca-de' },
	history: { 'pt-BR': '/historico', en: '/en/history', es: '/es/historial' },
	upscaler: { 'pt-BR': '/ampliar/', en: '/en/upscaler/', es: '/es/escalar-imagen/' }
} as const;

export type PageId = keyof typeof urls;
export type Locale = keyof (typeof urls)['tool'];
export const locales: Locale[] = ['pt-BR', 'en', 'es'];
export const pageIds = Object.keys(urls) as PageId[];

/** Attribute maps of every `<link>` in the head of an HTML document. */
export function headLinks(html: string): Array<Record<string, string>> {
	const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? '';
	return [...head.matchAll(/<link\b([^>]*)>/g)].map((match) =>
		Object.fromEntries(
			[...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])
		)
	);
}
