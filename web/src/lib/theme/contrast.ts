// Color math for the theme's contrast guarantees (design-tokens D7).
// No dependency: oklch -> OKLab -> linear sRGB, then WCAG 2.x luminance.

export type Theme = 'light' | 'dark';

/** A parsed `oklch(L C H)` color (L in 0..1, C >= 0, H in degrees). */
export interface Oklch {
	l: number;
	c: number;
	h: number;
	alpha: number;
}

/** Linear-light sRGB channels; values outside 0..1 are out of gamut. */
export type LinearRgb = [number, number, number];

/** A pair of tokens that must meet a minimum contrast ratio in both themes. */
export interface ContrastPair {
	fg: string;
	bg: string;
	min: number;
}

/** Every checked pair and threshold (D1 table). */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
	{ fg: 'foreground', bg: 'background', min: 4.5 },
	{ fg: 'foreground', bg: 'card', min: 4.5 },
	{ fg: 'card-foreground', bg: 'card', min: 4.5 },
	{ fg: 'popover-foreground', bg: 'popover', min: 4.5 },
	{ fg: 'muted-foreground', bg: 'background', min: 4.5 },
	{ fg: 'muted-foreground', bg: 'muted', min: 4.5 },
	{ fg: 'primary-foreground', bg: 'primary', min: 4.5 },
	{ fg: 'primary', bg: 'background', min: 4.5 },
	{ fg: 'secondary-foreground', bg: 'secondary', min: 4.5 },
	{ fg: 'accent-foreground', bg: 'accent', min: 4.5 },
	{ fg: 'destructive-foreground', bg: 'destructive', min: 4.5 },
	{ fg: 'destructive', bg: 'background', min: 4.5 },
	{ fg: 'ring', bg: 'background', min: 3 },
	{ fg: 'input', bg: 'background', min: 3 },
	{ fg: 'foreground', bg: 'checkerboard-b', min: 4.5 }
];

const OKLCH =
	/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/;

/** Parses an `oklch()` value; returns `undefined` for anything else. */
export function parseOklch(value: string): Oklch | undefined {
	const match = value.trim().match(OKLCH);
	if (!match) return undefined;
	const [, l, lPercent, c, h, alpha, alphaPercent] = match;
	return {
		l: Number(l) / (lPercent ? 100 : 1),
		c: Number(c),
		h: Number(h),
		alpha: alpha === undefined ? 1 : Number(alpha) / (alphaPercent ? 100 : 1)
	};
}

/** Converts oklch to linear sRGB (Björn Ottosson's OKLab matrices). */
export function oklchToLinearRgb({ l, c, h }: Oklch): LinearRgb {
	const rad = (h * Math.PI) / 180;
	const a = c * Math.cos(rad);
	const b = c * Math.sin(rad);
	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
		-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
		-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
	];
}

/** Whether a color is inside the sRGB gamut (small tolerance for rounding). */
export function inSrgbGamut(rgb: LinearRgb, tolerance = 1e-4): boolean {
	return rgb.every((channel) => channel >= -tolerance && channel <= 1 + tolerance);
}

/** sRGB hex of a color (for docs and the showcase), clamped to the gamut. */
export function toHex(rgb: LinearRgb): string {
	const encode = (v: number) => {
		const x = Math.min(1, Math.max(0, v));
		const srgb = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
		return Math.round(srgb * 255)
			.toString(16)
			.padStart(2, '0');
	};
	return `#${rgb.map(encode).join('')}`;
}

/** WCAG relative luminance from linear sRGB. */
export function relativeLuminance(rgb: LinearRgb): number {
	const [r, g, b] = rgb.map((v) => Math.min(1, Math.max(0, v)));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1..21). */
export function contrastRatio(a: LinearRgb, b: LinearRgb): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Token name -> raw value, per theme. */
export type ThemeTokens = Record<Theme, Record<string, string>>;

function declarations(block: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const match of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
		result[match[1]] = match[2].trim();
	}
	return result;
}

function blockAfter(css: string, selector: RegExp): string {
	const match = selector.exec(css);
	if (!match) throw new Error(`Selector ${selector} not found in the theme CSS`);
	const start = match.index + match[0].length;
	const end = css.indexOf('}', start);
	return css.slice(start, end);
}

/**
 * Extracts the light (`:root, .light`) and dark (`.dark`) token blocks from
 * the theme stylesheet. Dark inherits every token it does not redefine.
 */
export function parseThemeTokens(css: string): ThemeTokens {
	const light = declarations(blockAfter(css, /^:root,\s*\.light\s*\{/m));
	const dark = { ...light, ...declarations(blockAfter(css, /^\.dark\s*\{/m)) };
	return { light, dark };
}

/** Resolves a token (following `var(--x)` references) to a color. */
export function resolveColor(tokens: Record<string, string>, name: string): Oklch {
	const seen = new Set<string>();
	let current = name;
	for (;;) {
		if (seen.has(current)) throw new Error(`Circular reference in --${name}`);
		seen.add(current);
		const value = tokens[current];
		if (value === undefined) throw new Error(`Token --${current} is not defined`);
		const ref = value.match(/^var\(--([\w-]+)\)$/);
		if (ref) {
			current = ref[1];
			continue;
		}
		const color = parseOklch(value);
		if (!color) throw new Error(`Token --${current} is not an oklch() color: ${value}`);
		return color;
	}
}

export interface PairResult extends ContrastPair {
	theme: Theme;
	ratio: number;
	ok: boolean;
}

/** Evaluates every contrast pair in both themes. */
export function checkContrast(
	tokens: ThemeTokens,
	pairs: readonly ContrastPair[] = CONTRAST_PAIRS
): PairResult[] {
	return (['light', 'dark'] as const).flatMap((theme) =>
		pairs.map((pair) => {
			const fg = oklchToLinearRgb(resolveColor(tokens[theme], pair.fg));
			const bg = oklchToLinearRgb(resolveColor(tokens[theme], pair.bg));
			const ratio = contrastRatio(fg, bg);
			return { ...pair, theme, ratio, ok: ratio >= pair.min };
		})
	);
}

/** Human-readable failure line naming the pair and the theme. */
export function describeFailure(result: PairResult): string {
	return `${result.fg} on ${result.bg} (${result.theme} theme): ${result.ratio.toFixed(2)}:1 is below ${result.min}:1`;
}
