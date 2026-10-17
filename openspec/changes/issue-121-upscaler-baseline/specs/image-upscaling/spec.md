## Purpose
Define a private, browser-only conventional resampling tool for enlarging one static image.

## ADDED Requirements

### Requirement: Local conventional image upscaling
The app SHALL provide a dedicated, localized page that enlarges one supported static raster image using conventional browser resampling. It SHALL clearly identify the selected method and SHALL NOT present it as learned reconstruction or AI enhancement. The source image SHALL remain on the user's device.

#### Scenario: Upscale a supported image
- **WHEN** a user selects a supported static image and starts processing
- **THEN** the page shows the source and enlarged result
- **AND** processing and previews remain local to the browser
- **AND** the result can be downloaded as a PNG file

#### Scenario: Method disclosure
- **WHEN** the upscaler is displayed
- **THEN** its method is described as conventional browser resampling
- **AND** no ONNX model or learned-enhancement option is offered

### Requirement: Bounded input and output
Before decoding pixel data or allocating an output canvas, the app SHALL validate the input format, dimensions, scale, and resulting output dimensions against documented limits. It SHALL reject malformed, animated, unsupported, or over-limit input with a localized error and SHALL preserve the selected source for retry. Limits SHALL apply to dimensions and pixel counts, not an arbitrary fixed encoded-file-size threshold.

#### Scenario: Input exceeds a dimension or pixel limit
- **WHEN** a selected image's declared dimensions exceed the documented input bounds
- **THEN** it is rejected before full pixel decoding or output allocation
- **AND** the user receives a localized explanation

#### Scenario: Output exceeds a dimension or pixel limit
- **WHEN** the selected scale would produce output beyond the documented bounds
- **THEN** processing does not begin
- **AND** the page explains which output constraint was exceeded

#### Scenario: Invalid or unsupported image
- **WHEN** a user selects malformed or unsupported image data, including animated media
- **THEN** no output is allocated
- **AND** the source selection remains available for retry

### Requirement: Responsive cancellable processing
Image decoding, resampling, and encoding SHALL run in a dedicated worker so the page remains responsive. The user SHALL be able to cancel processing; cancellation SHALL stop worker activity and release temporary resources. Progress and failures SHALL be exposed as stable codes for localized presentation.

#### Scenario: Cancel an active operation
- **WHEN** the user cancels an upscale operation
- **THEN** the worker is terminated, temporary resources are released, and the source remains available

#### Scenario: Processing failure
- **WHEN** decoding, resampling, or encoding fails
- **THEN** a localized error is shown, the source is retained, and retry is possible

### Requirement: Local lifecycle and accessible controls
The page SHALL provide keyboard-accessible source selection, scale selection, output-dimension information, progress, cancellation, retry, preview, and download controls. Temporary object URLs and worker resources SHALL be released when replaced or when the page is destroyed. Download filenames SHALL be locale-neutral.

#### Scenario: Replace source image
- **WHEN** the user selects a different source image
- **THEN** previews and temporary resources associated with the previous source and output are released

#### Scenario: Keyboard operation
- **WHEN** a user operates the tool with a keyboard
- **THEN** all input, processing, cancellation, and download actions are reachable and have localized accessible names
