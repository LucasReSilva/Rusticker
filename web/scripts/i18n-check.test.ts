import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCatalogs, checkProject, formatProblem, isEmptyValue } from './i18n-check';

const base = {
	locale: 'pt-BR',
	catalog: { $schema: 'x', nav_about: 'Sobre', nav_tool: 'Ferramenta' }
};

const entry = (catalog: Record<string, unknown> | undefined, locale = 'xx') => ({
	path: `./messages/${locale}.json`,
	catalog
});

describe('checkCatalogs', () => {
	it('reports a missing key', () => {
		const problems = checkCatalogs(base, { es: entry({ nav_tool: 'Herramienta' }) });
		expect(problems).toEqual([{ locale: 'es', kind: 'missing', key: 'nav_about' }]);
		expect(problems.map(formatProblem)).toEqual(['es: missing key nav_about']);
	});

	it('reports an extra key', () => {
		const problems = checkCatalogs(base, {
			en: entry({ nav_about: 'About', nav_tool: 'Tool', nav_extra: 'Extra' })
		});
		expect(problems).toEqual([{ locale: 'en', kind: 'extra', key: 'nav_extra' }]);
		expect(formatProblem(problems[0])).toBe('en: extra key nav_extra');
	});

	it('reports an empty translation', () => {
		const problems = checkCatalogs(base, { en: entry({ nav_about: '  ', nav_tool: 'Tool' }) });
		expect(problems).toEqual([{ locale: 'en', kind: 'empty', key: 'nav_about' }]);
	});

	it('passes complete catalogs and ignores $schema', () => {
		expect(
			checkCatalogs(base, {
				'pt-BR': entry(base.catalog),
				en: entry({ $schema: 'x', nav_about: 'About', nav_tool: 'Tool' }),
				es: entry({ nav_about: 'Acerca de', nav_tool: 'Herramienta' })
			})
		).toEqual([]);
	});

	it('reports a registered locale without a catalog file', () => {
		const problems = checkCatalogs(base, { de: entry(undefined, 'de') });
		expect(problems).toEqual([
			{ locale: 'de', kind: 'missing-catalog', path: './messages/de.json' }
		]);
		expect(formatProblem(problems[0])).toBe('de: missing catalog ./messages/de.json');
	});
});

describe('isEmptyValue', () => {
	it('handles variant (plural) values', () => {
		const variant = (match: Record<string, string>) => [{ declarations: [], selectors: [], match }];
		expect(isEmptyValue(variant({ 'count=one': '1 sticker', 'count=*': '{count} stickers' }))).toBe(
			false
		);
		expect(isEmptyValue(variant({ 'count=one': '1 sticker', 'count=*': '' }))).toBe(true);
		expect(isEmptyValue(variant({}))).toBe(true);
		expect(isEmptyValue([])).toBe(true);
	});
});

describe('checkProject (reads the locale list from the settings)', () => {
	let dir: string;

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	function project(locales: string[], files: Record<string, Record<string, string>>) {
		dir = mkdtempSync(join(tmpdir(), 'i18n-check-'));
		mkdirSync(join(dir, 'project.inlang'));
		mkdirSync(join(dir, 'messages'));
		writeFileSync(
			join(dir, 'project.inlang', 'settings.json'),
			JSON.stringify({
				baseLocale: 'pt-BR',
				locales,
				'plugin.inlang.messageFormat': { pathPattern: './messages/{locale}.json' }
			})
		);
		for (const [locale, catalog] of Object.entries(files)) {
			writeFileSync(join(dir, 'messages', `${locale}.json`), JSON.stringify(catalog));
		}
		return join(dir, 'project.inlang');
	}

	it('checks a newly registered locale without changes to the check', () => {
		const problems = checkProject(
			project(['pt-BR', 'en', 'de'], { 'pt-BR': { a: 'A' }, en: { a: 'A' } })
		);
		expect(problems.map(formatProblem)).toEqual(['de: missing catalog ./messages/de.json']);
	});

	it('passes when every registered catalog is complete', () => {
		expect(checkProject(project(['pt-BR', 'en'], { 'pt-BR': { a: 'A' }, en: { a: 'B' } }))).toEqual(
			[]
		);
	});
});
