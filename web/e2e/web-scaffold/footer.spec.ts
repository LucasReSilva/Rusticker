import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pages, pageIds } from '../../src/lib/i18n/routes.js';
import { base, savedLocale } from './fixtures';

type FooterCatalog = {
	footer_navigation: string;
	footer_version: string;
	footer_processing_local: string;
	footer_privacy: string;
	footer_repository: string;
	footer_changelog: string;
};

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
}

const { version } = readJson<{ version: string }>('../../package.json');
const catalogs = {
	'pt-BR': readJson<FooterCatalog>('../../messages/pt-BR.json'),
	en: readJson<FooterCatalog>('../../messages/en.json'),
	es: readJson<FooterCatalog>('../../messages/es.json')
};

for (const locale of ['pt-BR', 'en', 'es'] as const) {
	test.describe(`footer in ${locale}`, () => {
		test.use({ storageState: savedLocale(locale) });

		for (const routeId of pageIds) {
			test(`appears on ${routeId} with localized content and links`, async ({ page }) => {
				await page.goto(pages[routeId][locale].slice(1));
				const footer = page.locator('footer');
				const catalog = catalogs[locale];
				await expect(footer).toBeVisible();
				await expect(footer).toContainText(catalog.footer_version.replace('{version}', version));
				await expect(footer).toContainText(catalog.footer_processing_local);
				const links = footer.getByRole('navigation', { name: catalog.footer_navigation });
				await expect(links.getByRole('link', { name: catalog.footer_privacy })).toHaveAttribute(
					'href',
					`${base}${pages.about[locale]}`
				);
				await expect(links.getByRole('link', { name: catalog.footer_repository })).toHaveAttribute(
					'href',
					'https://github.com/LucasReSilva/Rusticker'
				);
				await expect(links.getByRole('link', { name: catalog.footer_changelog })).toHaveAttribute(
					'href',
					'https://github.com/LucasReSilva/Rusticker/blob/main/CHANGELOG.md'
				);
			});
		}
	});
}

test.describe('prerendered footer', () => {
	test.use({ javaScriptEnabled: false, storageState: savedLocale('es') });

	test('is visible without scripts on a content page', async ({ page }) => {
		await page.goto(pages.about.es.slice(1));
		await expect(page.locator('footer')).toContainText(
			catalogs.es.footer_version.replace('{version}', version)
		);
		await expect(page.locator('footer')).toContainText(catalogs.es.footer_processing_local);
		await expect(page.locator('footer a')).toHaveCount(3);
	});
});

test('wraps after content at 375px with keyboard-visible focus', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 900 });
	await page.goto(pages.about['pt-BR'].slice(1));
	const main = await page.locator('main').boundingBox();
	const footer = await page.locator('footer').boundingBox();
	expect(main).not.toBeNull();
	expect(footer).not.toBeNull();
	expect(footer!.y).toBeGreaterThanOrEqual(main!.y + main!.height);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
	const privacy = page.locator('footer a').first();
	await privacy.focus();
	await page.keyboard.press('Shift+Tab');
	await page.keyboard.press('Tab');
	await expect(privacy).toBeFocused();
	expect(await privacy.evaluate((link) => link.matches(':focus-visible'))).toBe(true);
});
