import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { locales } from '$lib/paraglide/runtime';
import { oklchToLinearRgb, parseThemeTokens, resolveColor, toHex } from '$lib/theme/contrast';
import { BACKGROUND_COLOR, THEME_COLOR, buildManifest, type WebAppManifest } from './manifest';

const catalog = (locale: string) =>
	JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, string>;

const appCss = readFileSync(fileURLToPath(new URL('../../app.css', import.meta.url)), 'utf8');
const lightPrimaryHex = toHex(
	oklchToLinearRgb(resolveColor(parseThemeTokens(appCss).light, 'primary'))
).toUpperCase();

const startUrls = { 'pt-BR': '/Rusticker/', en: '/Rusticker/en/', es: '/Rusticker/es/' };

const shared = (manifest: WebAppManifest) => ({
	id: manifest.id,
	scope: manifest.scope,
	display: manifest.display,
	theme_color: manifest.theme_color,
	background_color: manifest.background_color,
	icons: manifest.icons
});

describe('buildManifest', () => {
	it.each(locales)('localizes the %s manifest', (locale) => {
		const manifest = buildManifest(locale, '/Rusticker');
		const messages = catalog(locale);
		expect(manifest.name).toBe(messages.pwa_name);
		expect(manifest.short_name).toBe(messages.pwa_short_name);
		expect(manifest.short_name.length).toBeLessThanOrEqual(12);
		expect(manifest.description).toBe(messages.pwa_description);
		expect(manifest.lang).toBe(locale);
		expect(manifest.start_url).toBe(startUrls[locale]);
	});

	it('shares identity, scope, display, colors and icons across locales', () => {
		const [first, ...rest] = locales.map((locale) => buildManifest(locale, '/Rusticker'));
		for (const manifest of rest) expect(shared(manifest)).toEqual(shared(first));
		expect(first.id).toBe('/Rusticker/');
		expect(first.scope).toBe('/Rusticker/');
		expect(first.display).toBe('standalone');
		expect(THEME_COLOR).toBe('#B65329');
		expect(THEME_COLOR).toBe(lightPrimaryHex);
		expect(BACKGROUND_COLOR).toBe('#FFFFFF');
		expect(first.theme_color).toBe(THEME_COLOR);
		expect(first.background_color).toBe(BACKGROUND_COLOR);
	});

	it('lists 192 and 512 icons, one maskable, all present under the base path', () => {
		const { icons } = buildManifest('en', '/Rusticker');
		expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
		expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
		for (const icon of icons) {
			expect(icon.src.startsWith('/Rusticker/icons/')).toBe(true);
			expect(existsSync(`static/${icon.src.slice('/Rusticker/'.length)}`)).toBe(true);
		}
	});

	it('works at the domain root', () => {
		const manifest = buildManifest('es', '');
		expect(manifest.scope).toBe('/');
		expect(manifest.start_url).toBe('/es/');
		expect(manifest.icons[0].src).toBe('/icons/pwa-192x192.png');
	});
});
