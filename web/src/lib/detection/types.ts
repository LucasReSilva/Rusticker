// Public detection contract shared by the tool UI and the WhatsApp export.
// Framework-free: nothing here knows about wasm, workers, or Comlink.

/** Side, in pixels, of every sticker image returned by detection. */
export const STICKER_SIZE = 512;

/** Bounding box of a sticker in source-image pixels. */
export interface BBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A color with integer channels from 0 to 255. */
export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/** Options for one detection request. */
export interface DetectOptions {
	/** The background color to remove; each channel an integer 0-255. */
	background: Rgb;
	/** 0-100; non-integers are rounded to the nearest integer. */
	tolerance: number;
}

/** The image to analyze: straight RGBA pixels (an `ImageData` fits). */
export type DetectInput = Pick<ImageData, 'data' | 'width' | 'height'>;

/** One detected sticker, in reading order. */
export interface Sticker {
	/** Unique within the page session; changes on every detection run. */
	id: string;
	/** Zero-based position in the result list. */
	index: number;
	bbox: BBox;
	/** 512x512 RGBA image with a transparent background. */
	pixels: ImageData;
}

/**
 * Language-neutral failure codes. The first three come from the Rust core;
 * `WorkerFailed` covers everything else (engine load failure, crash,
 * unexpected value). Map them to text with `detectionErrorMessage`.
 */
export type DetectionErrorCode = 'NoStickers' | 'ImageTooLarge' | 'InvalidInput' | 'WorkerFailed';

/** Every `DetectionErrorCode`, for exhaustive tests and guards. */
export const DETECTION_ERROR_CODES: readonly DetectionErrorCode[] = [
	'NoStickers',
	'ImageTooLarge',
	'InvalidInput',
	'WorkerFailed'
];

/** A detection failure. `message` equals the code and is never shown to users. */
export class DetectionError extends Error {
	readonly code: DetectionErrorCode;

	constructor(code: DetectionErrorCode, options?: { cause?: unknown }) {
		super(code, options);
		this.name = 'DetectionError';
		this.code = code;
	}
}

/** Runs detection; see `createDetector()` and `createMockDetector()`. */
export interface Detector {
	/**
	 * Detects the stickers in `image`. Resolves with the stickers in reading
	 * order; rejects with a `DetectionError`, or with an `AbortError`
	 * (`isCancelled(error)`) when a newer request superseded this one.
	 * The caller's `image` is never modified or detached.
	 */
	detect(image: DetectInput, options: DetectOptions): Promise<Sticker[]>;
	/** Proposes reviewed sub-stickers for one framed image; empty means no proposal. */
	proposeSplit(image: DetectInput): Promise<Sticker[]>;
	/** Stops the background context; later `detect` calls fail with `WorkerFailed`. */
	dispose(): void;
}

/** Whether `error` is the rejection of a request superseded by a newer one (or disposed). */
export function isCancelled(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { name?: unknown }).name === 'AbortError'
	);
}

/** The rejection value for superseded or disposed requests. */
export function cancelledError(): DOMException {
	return new DOMException('Detection request superseded', 'AbortError');
}
