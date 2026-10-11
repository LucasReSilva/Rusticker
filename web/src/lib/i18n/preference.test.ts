import { describe, expect, it } from 'vitest';
import { readSavedLocale, saveLocalePreference } from './preference';

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value)
	};
}

const blocked = () => {
	throw new DOMException('denied', 'SecurityError');
};

describe('readSavedLocale', () => {
	it('reads the saved locale under Paraglide key', () => {
		const storage = memoryStorage({ PARAGLIDE_LOCALE: 'es' });
		expect(readSavedLocale(() => storage)).toBe('es');
	});

	it('returns undefined when nothing is saved', () => {
		expect(readSavedLocale(() => memoryStorage())).toBeUndefined();
	});

	it('ignores unsupported saved values', () => {
		expect(readSavedLocale(() => memoryStorage({ PARAGLIDE_LOCALE: 'fr' }))).toBeUndefined();
		expect(readSavedLocale(() => memoryStorage({ PARAGLIDE_LOCALE: '' }))).toBeUndefined();
	});

	it('treats blocked storage as no preference', () => {
		expect(readSavedLocale(blocked)).toBeUndefined();
	});
});

describe('saveLocalePreference', () => {
	it('writes the locale under Paraglide key', () => {
		const storage = memoryStorage();
		saveLocalePreference('en', () => storage);
		expect(storage.data.get('PARAGLIDE_LOCALE')).toBe('en');
		expect(readSavedLocale(() => storage)).toBe('en');
	});

	it('does not throw when storage is blocked', () => {
		expect(() => saveLocalePreference('en', blocked)).not.toThrow();
	});
});
