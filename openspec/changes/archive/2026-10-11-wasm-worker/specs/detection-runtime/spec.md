## Purpose

Defines how the web app runs sticker detection inside the user's browser: off the main thread, with ordered results, failures reported as error codes, stale results discarded, offline operation once loaded, and a deterministic test double for other features.

## ADDED Requirements

### Requirement: Detection runs off the main thread
The web app SHALL run sticker detection in a background execution context separate from the page's main thread, so the interface keeps responding to input while an image is being processed.

#### Scenario: Interface stays responsive during detection
- **WHEN** detection is running on a large image (for example 2752x1536 pixels)
- **THEN** the page continues to respond to pointer and keyboard input and to repaint while detection is in progress

#### Scenario: Detection engine is initialized once per session
- **WHEN** the app performs detection several times on the same page
- **THEN** the detection engine is loaded and initialized only once, and later detections reuse it

### Requirement: Detection input contract
A detection request SHALL take an image (RGBA pixels, width, height), a background color (red, green, blue channels, each an integer 0-255) and a tolerance (0-100). Tolerance values that are not integers SHALL be rounded to the nearest integer before use. The caller's image SHALL remain intact and reusable after the request.

#### Scenario: Caller can reuse the same image
- **WHEN** the caller requests detection twice with the same image and different tolerances
- **THEN** both requests run on the full, unmodified image pixels

#### Scenario: Out-of-range options are rejected
- **WHEN** the caller passes a background channel outside 0-255 or a tolerance outside 0-100 after rounding
- **THEN** the request fails with error code `InvalidInput` and no detection is run

### Requirement: Ordered sticker results
A successful detection SHALL return the detected stickers in reading order (rows by vertical center, then left to right), each with: a zero-based index equal to its position in the list, an identifier unique within the page session, its bounding box in source-image pixels (x, y, width, height), and a 512x512 RGBA image with a transparent background.

#### Scenario: Results keep the core's order
- **WHEN** detection succeeds on an image with stickers arranged in several rows
- **THEN** the returned list is ordered row by row and left to right, and each sticker's index equals its position

#### Scenario: Every sticker image is 512x512
- **WHEN** detection succeeds
- **THEN** every returned sticker image is exactly 512 pixels wide and 512 pixels tall with an alpha channel

#### Scenario: Identifiers are unique across detections
- **WHEN** the app runs detection twice in the same page session
- **THEN** no identifier from the second result equals an identifier from the first result

#### Scenario: Sample image yields 17 stickers (local-only check)
- **WHEN** the developer runs the local integration check with the sample image (green background, 17 stickers in rows of 5, 6 and 6) at the default tolerance and the picked green background
- **THEN** exactly 17 stickers are returned, in reading order
- **AND** the check is skipped, not failed, when the sample image location is not configured

### Requirement: Failures are reported as error codes
Every detection failure SHALL be reported as one of the error codes `NoStickers`, `ImageTooLarge`, `InvalidInput`, or `WorkerFailed`, never as user-facing text. Codes produced by the detection core SHALL be passed through unchanged; any other failure (engine load failure, crash, unexpected value) SHALL be reported as `WorkerFailed`.

#### Scenario: No stickers found
- **WHEN** detection finds no sticker in the image
- **THEN** the request fails with error code `NoStickers`

#### Scenario: Image exceeds supported size
- **WHEN** the image is wider or taller than 8192 pixels, or has more than 40,000,000 pixels
- **THEN** the request fails with error code `ImageTooLarge`

#### Scenario: Malformed input
- **WHEN** the pixel data length does not match width x height x 4, or width or height is zero
- **THEN** the request fails with error code `InvalidInput`

#### Scenario: Unknown or unexpected failure
- **WHEN** the detection engine fails to load, crashes, or reports a failure that is not one of the known core codes
- **THEN** the request fails with error code `WorkerFailed`

### Requirement: Localized message for every error code
For every detection error code, the web app SHALL provide a user-facing message that exists in every supported locale (pt-BR, en, es), so the interface can show any failure in the active language.

#### Scenario: All codes have messages in all locales
- **WHEN** the localization check runs
- **THEN** a message exists for each of `NoStickers`, `ImageTooLarge`, `InvalidInput`, and `WorkerFailed` in pt-BR, en, and es

### Requirement: Latest request wins
When a new detection request starts before a previous one has finished, only the newest request SHALL deliver a result. Every superseded request SHALL settle promptly as cancelled (distinguishable from the error codes) and its result, if computed, SHALL be discarded. The runtime SHALL NOT keep more than one superseded request computing in the background at any time; requests that have not started computing when superseded SHALL be dropped without being computed.

#### Scenario: Rapid successive requests
- **WHEN** three detection requests are issued in quick succession before the first finishes
- **THEN** only the third request resolves with stickers
- **AND** the first two settle as cancelled, not as detection errors
- **AND** the second request is never computed

#### Scenario: Stale result arrives late
- **WHEN** a superseded request's computation finishes after a newer request was issued
- **THEN** its stickers are discarded and never delivered to any caller

### Requirement: Recovery after engine failure
After a `WorkerFailed` failure, the next detection request SHALL start from a freshly initialized detection engine rather than failing permanently.

#### Scenario: Request after a crash
- **WHEN** a request fails with `WorkerFailed` because the background context crashed
- **THEN** a subsequent request with a valid image runs on a newly started engine and can succeed

### Requirement: Disposal releases resources
Disposing a detector SHALL stop its background context and release its resources. Pending requests SHALL settle as cancelled, and requests made after disposal SHALL fail with `WorkerFailed`.

#### Scenario: Dispose with a pending request
- **WHEN** a detector is disposed while a request is pending
- **THEN** the pending request settles as cancelled and the background context is terminated

### Requirement: Local-only and offline-capable execution
Detection SHALL run entirely on the user's device. Image pixels and detection results SHALL never be sent over the network. The only network request made by the detection runtime SHALL be loading its own engine file from the app's origin, under the app's base path; once loaded, detection SHALL work without network access.

#### Scenario: Works offline after loading
- **WHEN** the detection engine has been loaded and the device then goes offline
- **THEN** further detection requests still succeed

#### Scenario: Engine served under the base path
- **WHEN** the site is built and served under a non-root base path (for example `/Rusticker`)
- **THEN** the detection engine file is requested from a URL under that base path on the same origin, and detection succeeds

#### Scenario: No user data leaves the device
- **WHEN** detection runs on an image
- **THEN** no network request contains the image's pixels or any detection result

### Requirement: Deterministic test double
The web app SHALL provide a test detector with the same request, result, cancellation, and error semantics as the real one, which needs no compiled detection engine and returns synthetic stickers that depend only on its configuration and the input image size.

#### Scenario: Same input, same output
- **WHEN** the test detector is called twice with the same image size and options
- **THEN** both results have the same number of stickers, the same bounding boxes, and identical pixels

#### Scenario: Simulated failure
- **WHEN** the test detector is configured to fail with a given error code
- **THEN** its requests fail with that code
