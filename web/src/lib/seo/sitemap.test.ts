import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap } from './sitemap';

const site = 'https://example.github.io/Rusticker';

describe('sitemap', () => {
	it('lists the 12 URLs, each with 3 alternates and x-default', () => {
		const xml = buildSitemap(site);
		const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
		expect(entries).toHaveLength(12);
		for (const entry of entries) {
			expect(entry.match(/hreflang="(pt-BR|en|es)"/g)).toHaveLength(3);
			expect(entry.match(/hreflang="x-default"/g)).toHaveLength(1);
		}
		const locs = entries.map((entry) => entry.match(/<loc>(.*)<\/loc>/)?.[1]);
		expect(locs).toContain(`${site}/en/`);
		expect(locs).toContain(`${site}/es/acerca-de`);
		expect(locs).toContain(`${site}/es/historial`);
		expect(xml).not.toContain('/_');
	});

	it('points robots.txt at the absolute sitemap', () => {
		expect(buildRobots(site)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
	});
});
