import { describe, expect, it } from 'vitest';
import { servedUrl } from './precache';

describe('servedUrl', () => {
	it.each([
		['prerendered/pages/index.html', './'],
		['prerendered/pages/en/index.html', 'en/'],
		['prerendered/pages/en/about.html', 'en/about'],
		['prerendered/pages/como-usar.html', 'como-usar'],
		['prerendered/dependencies/manifest-en.webmanifest', 'manifest-en.webmanifest'],
		['client/_app/immutable/entry/app.js', '_app/immutable/entry/app.js'],
		['client/icons/pwa-192x192.png', 'icons/pwa-192x192.png'],
		['404.html', '404.html']
	])('maps %s to %s', (file, url) => {
		expect(servedUrl(file)).toBe(url);
	});
});
