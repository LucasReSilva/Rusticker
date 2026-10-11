import { DetectionError, type DetectOptions } from './types';

/** Options in the form the engine takes them. */
export interface EngineOptions {
	/** `0xRRGGBB`. */
	background: number;
	/** Integer 0-100. */
	tolerance: number;
}

const isChannel = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;

/**
 * Validates and packs detection options on the main thread (design D6).
 * Throws `DetectionError('InvalidInput')` for a channel outside 0-255 (or not
 * an integer) or a tolerance outside 0-100 after rounding. Image-shape checks
 * are left to the core, the single source of truth for limits.
 */
export function toEngineOptions(options: DetectOptions): EngineOptions {
	const { r, g, b } = options.background ?? {};
	if (!isChannel(r) || !isChannel(g) || !isChannel(b)) throw new DetectionError('InvalidInput');
	const tolerance = Math.round(options.tolerance);
	if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 100) {
		throw new DetectionError('InvalidInput');
	}
	// `+ 0` turns a rounded -0 into 0.
	return { background: (r << 16) | (g << 8) | b, tolerance: tolerance + 0 };
}
