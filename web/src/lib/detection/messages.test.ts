import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectionErrorMessage } from './messages';
import { DETECTION_ERROR_CODES } from './types';

const catalogKey = {
	NoStickers: 'error_no_stickers',
	ImageTooLarge: 'error_image_too_large',
	InvalidInput: 'error_invalid_input',
	WorkerFailed: 'error_worker_failed'
} as const;

const catalog = (locale: string) =>
	JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, string>;

describe('detectionErrorMessage', () => {
	it.each(DETECTION_ERROR_CODES)('returns the base-locale message for %s', (code) => {
		const message = detectionErrorMessage(code);
		expect(message.trim()).not.toBe('');
		expect(message).not.toBe(code);
		// Outside the browser the active locale is the base locale, pt-BR.
		expect(message).toBe(catalog('pt-BR')[catalogKey[code]]);
	});

	it.each(['pt-BR', 'en', 'es'])('has a message for every code in %s', (locale) => {
		const messages = catalog(locale);
		for (const code of DETECTION_ERROR_CODES) {
			expect(messages[catalogKey[code]]?.trim()).toBeTruthy();
		}
	});
});
