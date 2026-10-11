import { expect, it } from 'vitest';
import { formatNumber, formatKilobytes, formatPercent } from './format';

it.each([
	['pt-BR', '1.234,5'],
	['en', '1,234.5'],
	['es', '1234,5']
])('formats numbers for %s', (locale, expected) => {
	expect(formatNumber(1234.5, {}, locale)).toBe(expected);
});
it.each(['pt-BR', 'en', 'es'])('uses decimal KB and locale rounding for %s', (locale) => {
	for (const bytes of [99_500, 100_000, 1_234_500]) {
		const expected = new Intl.NumberFormat(locale, {
			style: 'unit',
			unit: 'kilobyte',
			unitDisplay: 'short',
			maximumFractionDigits: bytes >= 100_000 ? 0 : 1
		}).format(bytes / 1000);
		expect(formatKilobytes(bytes, locale)).toBe(expected);
	}
	expect(formatPercent(0.505, locale)).toBe(
		new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(0.505)
	);
});
