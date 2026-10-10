import { describe, expect, it } from 'vitest';
import { matchBrowserLocale } from './negotiate';

describe('matchBrowserLocale', () => {
	it.each([
		[['en-US', 'fr'], 'en'],
		[['es-419'], 'es'],
		[['pt-PT'], 'pt-BR'],
		[['pt'], 'pt-BR'],
		[['PT-br'], 'pt-BR'],
		[['EN'], 'en'],
		[['fr-FR', 'de', 'es-ES'], 'es']
	])('%j matches %s', (languages, expected) => {
		expect(matchBrowserLocale(languages)).toBe(expected);
	});

	it('returns undefined when nothing matches', () => {
		expect(matchBrowserLocale(['fr-FR', 'de'])).toBeUndefined();
		expect(matchBrowserLocale([])).toBeUndefined();
	});

	it('respects the order of the browser languages', () => {
		expect(matchBrowserLocale(['es', 'en'])).toBe('es');
		expect(matchBrowserLocale(['de', 'en-GB', 'es'])).toBe('en');
	});
});
