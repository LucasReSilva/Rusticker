import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ resolve: (pathname: string) => `/Rusticker${pathname}` }));
vi.mock('$lib/paraglide/runtime', () => ({ getLocale: () => 'es' }));

const { localizedPath } = await import('./links');

describe('localizedPath', () => {
	it('returns the translated slug with the base path', () => {
		expect(localizedPath('about', 'pt-BR')).toBe('/Rusticker/sobre');
		expect(localizedPath('howToUse', 'en')).toBe('/Rusticker/en/how-to-use');
		expect(localizedPath('tool', 'en')).toBe('/Rusticker/en/');
		expect(localizedPath('tool', 'pt-BR')).toBe('/Rusticker/');
	});

	it('defaults to the active locale', () => {
		expect(localizedPath('about')).toBe('/Rusticker/es/acerca-de');
		expect(localizedPath('tool')).toBe('/Rusticker/es/');
	});
});
