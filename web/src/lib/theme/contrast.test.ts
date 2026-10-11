import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	checkContrast,
	contrastRatio,
	describeFailure,
	inSrgbGamut,
	oklchToLinearRgb,
	parseOklch,
	parseThemeTokens,
	resolveColor,
	toHex
} from './contrast';

const css = readFileSync(fileURLToPath(new URL('../../app.css', import.meta.url)), 'utf8');
const tokens = parseThemeTokens(css);

describe('color math', () => {
	it('converts oklch white and black', () => {
		expect(toHex(oklchToLinearRgb(parseOklch('oklch(1 0 0)')!))).toBe('#ffffff');
		expect(toHex(oklchToLinearRgb(parseOklch('oklch(0 0 0)')!))).toBe('#000000');
	});

	it('gives 21:1 for black on white', () => {
		const white = oklchToLinearRgb(parseOklch('oklch(1 0 0)')!);
		const black = oklchToLinearRgb(parseOklch('oklch(0 0 0)')!);
		expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
	});

	it('parses alpha and percentages', () => {
		expect(parseOklch('oklch(52% 0.24 300 / 50%)')).toEqual({
			l: 0.52,
			c: 0.24,
			h: 300,
			alpha: 0.5
		});
		expect(parseOklch('#fff')).toBeUndefined();
	});

	it('flags out-of-gamut colors', () => {
		expect(inSrgbGamut(oklchToLinearRgb(parseOklch('oklch(0.9 0.4 150)')!))).toBe(false);
	});

	it('names the pair and theme when a token change breaks contrast', () => {
		const broken = parseThemeTokens(
			css.replace(/(:root,\s*\.light\s*\{[^}]*--primary:\s*)oklch\([^)]*\)/, '$1oklch(0.8 0.1 300)')
		);
		const failures = checkContrast(broken).filter((r) => !r.ok);
		expect(failures.map(describeFailure)).toContainEqual(
			expect.stringMatching(/^primary-foreground on primary \(light theme\): .* below 4.5:1$/)
		);
	});
});

describe('theme tokens in app.css', () => {
	it.each(['light', 'dark'] as const)('every %s color token is inside the sRGB gamut', (theme) => {
		const outside = Object.entries(tokens[theme])
			.filter(([, value]) => value.startsWith('oklch('))
			.filter(([name]) => !inSrgbGamut(oklchToLinearRgb(resolveColor(tokens[theme], name))))
			.map(([name]) => `--${name} (${theme} theme)`);
		expect(outside).toEqual([]);
	});

	it('meets every contrast threshold in both themes', () => {
		const failures = checkContrast(tokens)
			.filter((result) => !result.ok)
			.map(describeFailure);
		expect(failures).toEqual([]);
	});

	it('keeps the light checkerboard dark cell distinguishable from a white outline', () => {
		const white = oklchToLinearRgb(parseOklch('oklch(1 0 0)')!);
		const cellB = oklchToLinearRgb(resolveColor(tokens.light, 'checkerboard-b'));
		expect(contrastRatio(white, cellB)).toBeGreaterThan(1.3);
	});

	it('uses distinct checkerboard cells in both themes', () => {
		for (const theme of ['light', 'dark'] as const) {
			const a = oklchToLinearRgb(resolveColor(tokens[theme], 'checkerboard-a'));
			const b = oklchToLinearRgb(resolveColor(tokens[theme], 'checkerboard-b'));
			expect(contrastRatio(a, b), theme).toBeGreaterThan(1.15);
		}
	});
});
