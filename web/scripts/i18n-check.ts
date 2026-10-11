// Catalog completeness check (design D7): every locale must have exactly the
// base locale's keys, all with non-empty values. Run with `bun run i18n:check`.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Catalog = Record<string, unknown>;

export type Problem =
	| { locale: string; kind: 'missing' | 'extra' | 'empty'; key: string }
	| { locale: string; kind: 'missing-catalog'; path: string };

/**
 * Whether a message value is empty. A string is empty when blank. A
 * variant/plural value is empty when it has no variants or any variant is
 * empty.
 */
export function isEmptyValue(value: unknown): boolean {
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0 || value.some(isEmptyValue);
	if (value !== null && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		const variants = 'match' in record ? record.match : record;
		if (variants === null || typeof variants !== 'object') return true;
		const entries = Object.values(variants as Record<string, unknown>);
		return entries.length === 0 || entries.some(isEmptyValue);
	}
	return true;
}

/** Message keys of a catalog, without the `$schema` entry. */
function keysOf(catalog: Catalog): string[] {
	return Object.keys(catalog).filter((key) => key !== '$schema');
}

/**
 * Compares every locale catalog with the base catalog. A catalog of
 * `undefined` means its file does not exist.
 */
export function checkCatalogs(
	base: { locale: string; catalog: Catalog },
	catalogs: Record<string, { path: string; catalog: Catalog | undefined }>
): Problem[] {
	const problems: Problem[] = [];
	const baseKeys = keysOf(base.catalog);

	for (const key of baseKeys) {
		if (isEmptyValue(base.catalog[key])) problems.push({ locale: base.locale, kind: 'empty', key });
	}

	for (const [locale, { path, catalog }] of Object.entries(catalogs)) {
		if (locale === base.locale) continue;
		if (catalog === undefined) {
			problems.push({ locale, kind: 'missing-catalog', path });
			continue;
		}
		const keys = new Set(keysOf(catalog));
		for (const key of baseKeys) {
			if (!keys.has(key)) problems.push({ locale, kind: 'missing', key });
			else if (isEmptyValue(catalog[key])) problems.push({ locale, kind: 'empty', key });
		}
		for (const key of keys) {
			if (!(key in base.catalog)) problems.push({ locale, kind: 'extra', key });
		}
	}
	return problems;
}

/** One human-readable line per problem, e.g. `es: missing key nav_about`. */
export function formatProblem(problem: Problem): string {
	switch (problem.kind) {
		case 'missing':
			return `${problem.locale}: missing key ${problem.key}`;
		case 'extra':
			return `${problem.locale}: extra key ${problem.key}`;
		case 'empty':
			return `${problem.locale}: empty value for key ${problem.key}`;
		case 'missing-catalog':
			return `${problem.locale}: missing catalog ${problem.path}`;
	}
}

type Settings = {
	baseLocale: string;
	locales: string[];
	'plugin.inlang.messageFormat'?: { pathPattern?: string };
};

/** Loads the inlang settings and every catalog they reference. */
export function loadProject(projectDir: string) {
	const settings = JSON.parse(
		readFileSync(resolve(projectDir, 'settings.json'), 'utf8')
	) as Settings;
	const pathPattern =
		settings['plugin.inlang.messageFormat']?.pathPattern ?? './messages/{locale}.json';
	// pathPattern is relative to the folder that contains the project.
	const root = dirname(resolve(projectDir));

	const catalogs: Record<string, { path: string; catalog: Catalog | undefined }> = {};
	for (const locale of settings.locales) {
		const path = pathPattern.replace('{locale}', locale);
		const file = resolve(root, path);
		catalogs[locale] = {
			path,
			catalog: existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Catalog) : undefined
		};
	}
	return { settings, catalogs };
}

/** Runs the check on a project and returns the problems found. */
export function checkProject(projectDir: string): Problem[] {
	const { settings, catalogs } = loadProject(projectDir);
	const base = catalogs[settings.baseLocale];
	if (base?.catalog === undefined) {
		return [{ locale: settings.baseLocale, kind: 'missing-catalog', path: base?.path ?? '' }];
	}
	return checkCatalogs({ locale: settings.baseLocale, catalog: base.catalog }, catalogs);
}

if (import.meta.main) {
	const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '../project.inlang');
	const problems = checkProject(projectDir);
	for (const problem of problems) console.error(formatProblem(problem));
	if (problems.length > 0) {
		console.error(`i18n:check failed with ${problems.length} problem(s).`);
		process.exit(1);
	}
	console.log('i18n:check passed: every locale matches the base catalog.');
}
