import { expect, test } from '@playwright/test';
import { base, savedLocale } from '../web-scaffold/fixtures';

test.use({ locale: 'pt-BR', storageState: savedLocale('pt-BR') });

for (const [from, name, target, locale] of [
	['como-usar', 'Español', 'es/como-usar', 'es'],
	['es/como-usar', 'English', 'en/how-to-use', 'en'],
	['en/', 'Português (Brasil)', '', 'pt-BR'],
	['sobre', 'Español', 'es/acerca-de', 'es']
]) {
	test(`${from} switches to ${locale} without a document request`, async ({ page }) => {
		await page.goto(from);
		const documents: string[] = [];
		page.on('request', (request) => {
			if (request.resourceType() === 'document') documents.push(request.url());
		});
		await page.getByTestId('language-switcher').click();
		await page.getByRole('menuitemradio', { name, exact: true }).click();
		await expect(page).toHaveURL(`${base}/${target}`);
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.getByTestId('language-switcher')).toBeFocused();
		expect(documents).toEqual([]);
	});
}

test('language menu works with only the keyboard and remembers English', async ({ page }) => {
	await page.goto('como-usar');
	await page.keyboard.press('Tab');
	for (let tab = 0; tab < 10; tab++) {
		if (await page.getByTestId('language-switcher').evaluate((el) => el === document.activeElement))
			break;
		await page.keyboard.press('Tab');
	}
	await expect(page.getByTestId('language-switcher')).toBeFocused();
	await page.keyboard.press('Enter');
	await page.keyboard.press('e');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(`${base}/en/how-to-use`);
	await expect(page.getByTestId('language-switcher')).toBeFocused();
	await page.goto('');
	await expect(page).toHaveURL(`${base}/en/`);
});
