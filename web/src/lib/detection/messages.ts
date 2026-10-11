// The only place that maps detection error codes to user-facing text.
import { m } from '$lib/paraglide/messages';
import type { DetectionErrorCode } from './types';

/** The localized message for `code`, in the active locale. */
export function detectionErrorMessage(code: DetectionErrorCode): string {
	switch (code) {
		case 'NoStickers':
			return m.error_no_stickers();
		case 'ImageTooLarge':
			return m.error_image_too_large();
		case 'InvalidInput':
			return m.error_invalid_input();
		case 'WorkerFailed':
			return m.error_worker_failed();
		default: {
			// A new code without a message fails type-checking here.
			const unhandled: never = code;
			return unhandled;
		}
	}
}
