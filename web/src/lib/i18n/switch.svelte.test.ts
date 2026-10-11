import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pages } from './routes.js';

const state = vi.hoisted(() => ({ url: new URL('https://example.test/') }));
const goto = vi.hoisted(() => vi.fn(async (target: string) => void target));

vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		}
	}
}));
vi.mock('$app/paths', () => ({ resolve: (pathname: string) => pathname }));

const { switchLocale } = await import('./switch');
const { locale } = await import('./locale.svelte');

type PageId = keyof typeof pages;
type Locale = keyof (typeof pages)['tool'];

const ids = Object.keys(pages) as PageId[];
const localeList = Object.keys(pages.tool) as Locale[];

describe('switchLocale', () => {
	const reload = vi.fn();
	const assign = vi.fn();
	const replace = vi.fn();

	beforeEach(() => {
		goto.mockClear();
		reload.mockClear();
		assign.mockClear();
		replace.mockClear();
		localStorage.clear();
		// jsdom's location cannot be spied on, so swap in a fake for these tests.
		vi.stubGlobal('location', {
			...window.location,
			href: state.url.href,
			reload,
			assign,
			replace
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe.each(ids)('on the %s page', (id) => {
		it.each(localeList.flatMap((from) => localeList.map((to) => [from, to] as const)))(
			'maps %s to %s',
			async (from, to) => {
				state.url = new URL(`https://example.test${pages[id][from]}`);
				await switchLocale(to);
				expect(goto).toHaveBeenCalledWith(pages[id][to]);
			}
		);
	});

	it('keeps the query string and the hash', async () => {
		state.url = new URL('https://example.test/como-usar?x=1#step-3');
		await switchLocale('es');
		expect(goto).toHaveBeenCalledWith('/es/como-usar?x=1#step-3');
	});

	it('maps an unknown path under the target prefix', async () => {
		state.url = new URL('https://example.test/en/unknown');
		await switchLocale('es');
		expect(goto).toHaveBeenCalledWith('/es/unknown');
	});

	it('saves the preference and updates the reactive locale', async () => {
		state.url = new URL('https://example.test/sobre');
		await switchLocale('en');
		expect(localStorage.getItem('PARAGLIDE_LOCALE')).toBe('en');
		expect(locale.current).toBe('en');
	});

	it('never reloads or assigns the document', async () => {
		state.url = new URL('https://example.test/sobre');
		await switchLocale('en');
		await switchLocale('es');
		await switchLocale('pt-BR');
		expect(globalThis.location.reload).toBe(reload);
		expect(reload).not.toHaveBeenCalled();
		expect(assign).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});
});
