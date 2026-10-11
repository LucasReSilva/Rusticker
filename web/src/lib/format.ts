import { getLocale } from '$lib/paraglide/runtime';

const formatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(
	value: number,
	options: Intl.NumberFormatOptions = {},
	locale: string = getLocale()
): string {
	const key = JSON.stringify([locale, options]);
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, options);
		formatters.set(key, formatter);
	}
	return formatter.format(value);
}

/** Decimal kilobytes: the export budget uses 1000 bytes per KB. */
export function formatKilobytes(bytes: number, locale: string = getLocale()): string {
	return formatNumber(
		bytes / 1000,
		{
			style: 'unit',
			unit: 'kilobyte',
			unitDisplay: 'short',
			maximumFractionDigits: bytes >= 100_000 ? 0 : 1
		},
		locale
	);
}

export function formatPercent(ratio: number, locale: string = getLocale()): string {
	return formatNumber(ratio, { style: 'percent', maximumFractionDigits: 0 }, locale);
}
