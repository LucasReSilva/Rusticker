// Design guardrail (design-tokens D6): fails on raw color literals,
// physical-direction utilities, and magic pixel values in web/src.
// Run with `bun run lint:design`; exit code 1 when anything is found.
//
// Escape hatch: a line containing `lint-design-ignore: <reason>` is skipped.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Finding {
	file: string;
	line: number;
	message: string;
}

/** Physical utility prefix -> logical replacement. */
const PHYSICAL: Record<string, string> = {
	ml: 'ms',
	mr: 'me',
	pl: 'ps',
	pr: 'pe',
	left: 'start',
	right: 'end',
	'border-l': 'border-s',
	'border-r': 'border-e',
	'rounded-l': 'rounded-s',
	'rounded-r': 'rounded-e',
	'rounded-tl': 'rounded-ss',
	'rounded-tr': 'rounded-se',
	'rounded-bl': 'rounded-es',
	'rounded-br': 'rounded-ee',
	'scroll-ml': 'scroll-ms',
	'scroll-mr': 'scroll-me',
	'scroll-pl': 'scroll-ps',
	'scroll-pr': 'scroll-pe'
};

// Longest prefixes first so `rounded-tl` wins over `rounded`.
const physicalNames = Object.keys(PHYSICAL)
	.sort((a, b) => b.length - a.length)
	.join('|');
// A utility (optionally negative, after a variant `:` or a delimiter) that
// starts with a physical prefix followed by `-`, or text-left/text-right.
const PHYSICAL_RE = new RegExp(
	`(^|[\\s:"'\`{(,])(-?)(${physicalNames})-(?=[\\w\\[(./])|(^|[\\s:"'\`{(,])text-(left|right)(?![\\w-])`,
	'g'
);
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
// A color function with arguments (not prose such as "an oklch() value").
const COLOR_FN_RE = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(\s*(?:[\d.]|var\(|from\b)/g;
const PX_RE = /\[[^\]\s]*?\d(?:\.\d+)?px[^\]\s]*?\]/g;
const IGNORE_RE = /lint-design-ignore(?::\s*(\S.*))?/;

/** Whether a path (relative to web/, forward slashes) is in the generated ui kit. */
function inUiKit(file: string): boolean {
	return file.includes('src/lib/components/ui/');
}

/** Whether the class token around `index` is scoped to `data-[side=…]:`. */
function isSideScoped(line: string, index: number): boolean {
	const start = line.slice(0, index + 1).search(/\S*$/);
	return /^["'`{(,]*data-\[side=(left|right)\]:/.test(line.slice(start));
}

function isComment(trimmed: string): boolean {
	return (
		trimmed.startsWith('//') ||
		trimmed.startsWith('/*') ||
		trimmed.startsWith('*') ||
		trimmed.startsWith('<!--')
	);
}

/** Lints one source file. `file` is relative to web/ and only used for reporting and the ui/ rule. */
export function lintSource(file: string, text: string): Finding[] {
	const findings: Finding[] = [];
	const isCss = file.endsWith('.css');
	let inStyle = false;

	text.split(/\r?\n/).forEach((line, index) => {
		const lineNo = index + 1;
		const report = (message: string) => findings.push({ file, line: lineNo, message });
		const trimmed = line.trim();

		if (/<style[\s>]/.test(line)) inStyle = true;
		const cssContext = isCss || inStyle;
		if (/<\/style>/.test(line)) inStyle = false;

		const ignore = line.match(IGNORE_RE);
		if (ignore) {
			if (!ignore[1]) report('lint-design-ignore needs a reason: `lint-design-ignore: <reason>`');
			return;
		}
		if (isComment(trimmed)) return;

		for (const match of line.matchAll(HEX_RE)) {
			const before = line.slice(0, match.index);
			if (cssContext || /\b(class|style)\b/.test(before) || before.endsWith('[')) {
				report(`raw color "${match[0]}" (use a theme token such as bg-primary or var(--primary))`);
			}
		}
		for (const match of line.matchAll(COLOR_FN_RE)) {
			report(`raw color "${match[0]}…" (use a theme token; raw colors live only in src/app.css)`);
		}

		for (const match of line.matchAll(PHYSICAL_RE)) {
			const tokenStart = match.index + match[0].length - 1;
			if (isSideScoped(line, tokenStart)) continue;
			if (match[3]) {
				const used = `${match[2]}${match[3]}-`;
				report(
					`physical utility "${used}" (use "${match[2]}${PHYSICAL[match[3]]}-" so the layout mirrors in RTL)`
				);
			} else {
				const used = `text-${match[5]}`;
				report(
					`physical utility "${used}" (use "${match[5] === 'left' ? 'text-start' : 'text-end'}")`
				);
			}
		}

		if (!inUiKit(file) && !cssContext) {
			for (const match of line.matchAll(PX_RE)) {
				report(
					`magic pixel value "${match[0]}" (use the spacing scale or a theme token outside components/ui)`
				);
			}
		}
	});
	return findings;
}

const SOURCE_EXT = /\.(svelte|ts|js|css)$/;
const SKIPPED = /\.(test|spec)\.(ts|js)$/;

/** Every lintable file under `src/` (relative to web/, forward slashes). */
export function listSources(webDir: string): string[] {
	const files: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'paraglide') continue; // generated
				walk(path);
			} else if (SOURCE_EXT.test(entry.name) && !SKIPPED.test(entry.name)) {
				files.push(relative(webDir, path).split(sep).join('/'));
			}
		}
	};
	walk(join(webDir, 'src'));
	return files.filter((file) => file !== 'src/app.css').sort();
}

export function lintTree(webDir: string): Finding[] {
	return listSources(webDir).flatMap((file) =>
		lintSource(file, readFileSync(join(webDir, file), 'utf8'))
	);
}

if (import.meta.main) {
	const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const findings = lintTree(webDir);
	for (const { file, line, message } of findings) console.error(`${file}:${line}: ${message}`);
	if (findings.length > 0) {
		console.error(`\nlint-design: ${findings.length} problem(s). See DESIGN.md, "The Rule".`);
		process.exit(1);
	}
	console.log(
		`lint-design passed: ${listSources(webDir).length} files on tokens and logical utilities.`
	);
}
