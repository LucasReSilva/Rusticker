// The only place that maps detection error codes to user-facing text.
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/paraglide/runtime';
import type { DetectionErrorCode } from './types';

/**
 * The localized message for `code`, in `options.locale` or else the active
 * locale (components pass `locale.current` so a locale switch re-renders).
 */
export function detectionErrorMessage(
	code: DetectionErrorCode,
	options?: { locale?: Locale }
): string {
	switch (code) {
		case 'NoStickers':
			return m.error_no_stickers({}, options);
		case 'ImageTooLarge':
			return m.error_image_too_large({}, options);
		case 'InvalidInput':
			return m.error_invalid_input({}, options);
		case 'WorkerFailed':
			return m.error_worker_failed({}, options);
		default: {
			// A new code without a message fails type-checking here.
			const unhandled: never = code;
			return unhandled;
		}
	}
}
