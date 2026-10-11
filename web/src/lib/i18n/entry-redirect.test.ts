import { describe, expect, it } from 'vitest';
import { entryRedirect } from './entry-redirect';
import { readSavedLocale } from './preference';

const at = (path: string) => new URL(`https://example.test${path}`);

describe('entryRedirect (locale resolution order)', () => {
	it('lets a URL prefix win over the saved preference', () => {
		expect(entryRedirect(at('/en/about'), '', 'es', ['es'])).toBeUndefined();
	});

	it('applies a saved preference to an unprefixed URL', () => {
		expect(entryRedirect(at('/sobre'), '', 'es', [])).toBe('/es/acerca-de');
	});

	it('applies the browser language when nothing is saved', () => {
		expect(entryRedirect(at('/'), '', undefined, ['en-US', 'fr'])).toBe('/en/');
	});

	it('stays on the base locale when the saved preference is pt-BR', () => {
		expect(entryRedirect(at('/'), '', 'pt-BR', ['en-US'])).toBeUndefined();
	});

	it('falls back to the base locale without redirecting', () => {
		expect(entryRedirect(at('/como-usar'), '', undefined, ['fr-FR', 'de'])).toBeUndefined();
	});

	it('matches a regional variant of the base locale', () => {
		expect(entryRedirect(at('/'), '', undefined, ['pt-PT'])).toBeUndefined();
	});

	it('uses a saved preference that survives a reload', () => {
		expect(entryRedirect(at('/'), '', 'en', ['pt-BR'])).toBe('/en/');
	});

	it('keeps the saved preference after visiting a prefixed link', () => {
		// Visiting /en/about never writes storage, so a later visit to / uses `es`.
		expect(entryRedirect(at('/en/about'), '', 'es', [])).toBeUndefined();
		expect(entryRedirect(at('/'), '', 'es', ['en'])).toBe('/es/');
	});

	it('skips the saved preference when storage is blocked', () => {
		const saved = readSavedLocale(() => {
			throw new DOMException('denied', 'SecurityError');
		});
		expect(entryRedirect(at('/'), '', saved, ['es-ES'])).toBe('/es/');
	});

	it('ignores an unsupported saved value', () => {
		const saved = readSavedLocale(() => ({
			getItem: () => 'fr',
			setItem: () => undefined
		}));
		expect(entryRedirect(at('/'), '', saved, ['fr-FR'])).toBeUndefined();
	});

	it('keeps the query string and the hash', () => {
		expect(entryRedirect(at('/como-usar?x=1#step-3'), '', 'es', [])).toBe(
			'/es/como-usar?x=1#step-3'
		);
	});

	it('maps an unknown path under the target prefix', () => {
		expect(entryRedirect(at('/unknown'), '', 'en', [])).toBe('/en/unknown');
	});

	describe('with a base path', () => {
		it('redirects within the base path', () => {
			expect(entryRedirect(at('/Rusticker/sobre'), '/Rusticker', 'es', [])).toBe(
				'/Rusticker/es/acerca-de'
			);
			expect(entryRedirect(at('/Rusticker/'), '/Rusticker', undefined, ['en'])).toBe(
				'/Rusticker/en/'
			);
			expect(entryRedirect(at('/Rusticker'), '/Rusticker', undefined, ['en'])).toBe(
				'/Rusticker/en/'
			);
		});

		it('does not redirect prefixed URLs under the base path', () => {
			expect(entryRedirect(at('/Rusticker/en/about'), '/Rusticker', 'es', [])).toBeUndefined();
		});

		it('ignores URLs outside the base path', () => {
			expect(entryRedirect(at('/elsewhere'), '/Rusticker', 'es', [])).toBeUndefined();
		});
	});
});
