## Purpose

Lets users enlarge a local image with conventional resizing or optionally try learned detail reconstruction using a compatible ONNX model they provide, while retaining control over the result and keeping their data on-device.

## ADDED Requirements

### Requirement: Conventional enlargement remains the default
The upscaler SHALL use its conventional high-quality resize mode by default. The user SHALL be able to select an experimental learned mode without replacing or disabling the conventional mode. The experimental mode SHALL not load its inference runtime until the user selects that mode.

#### Scenario: Open upscaler without selecting learned mode
- **WHEN** a user opens the upscaler and selects an image
- **THEN** conventional resizing remains selected and its existing preview and download flow works without loading an ONNX runtime

#### Scenario: User switches to learned mode
- **WHEN** a user explicitly selects experimental learned upscaling
- **THEN** the interface explains that the mode is experimental and offers local model selection
- **AND** the conventional mode remains available for comparison

### Requirement: User supplies a compatible local ONNX model
The user SHALL select the ONNX model file from their device. Rusticker MUST NOT upload, automatically download, or silently bundle model weights whose artifact-specific redistribution rights are unresolved. The first supported graph contract SHALL accept one RGB `float32` NCHW tensor with batch size one and normalized values in the range `[0, 1]`, and SHALL return RGB `float32` output at exactly four times the input width and height. The interface SHALL identify the selected file and show its size as information only. The runtime SHALL reject incompatible graph inputs or outputs before replacing the current result.

#### Scenario: Compatible model is selected
- **WHEN** the user selects an ONNX model with the supported input and output contract
- **THEN** the model is loaded for the current local session and the UI reports its file name, file size, and supported scale

#### Scenario: Model graph is incompatible
- **WHEN** the selected model cannot be parsed or has an unsupported input, output, type, shape, or scale
- **THEN** the UI presents a localized recoverable error and keeps the original and conventional resize result available

#### Scenario: Network is inspected during model selection and inference
- **WHEN** the user selects a model or runs learned upscaling
- **THEN** no request contains the image pixels, model bytes, or inference output

### Requirement: Learned inference runs outside the interface thread
Learned inference SHALL run in a dedicated worker using a CPU/WASM execution provider. The current implementation SHALL disclose that inference uses browser CPU/WASM. Runtime assets SHALL be loaded only after learned mode is selected. A future Rust/WASM backend MAY replace or supplement the current backend after it supports the selected graph contract.

#### Scenario: Learned inference starts
- **WHEN** the user starts learned upscaling with a compatible model
- **THEN** image decoding, model inference, and output preparation run in a worker while the page remains responsive

#### Scenario: User cancels inference
- **WHEN** the user cancels a learned upscale while it is in progress
- **THEN** the worker is terminated or the operation is cancelled, temporary buffers are released, and the original image remains available

### Requirement: Alpha is preserved independently
The learned model SHALL process RGB without silently discarding the source alpha channel. Rusticker SHALL resize alpha independently to the actual model output dimensions and combine it with the learned RGB output. Transparent results SHALL remain viewable using the application's light and dark themes.

#### Scenario: Transparent input is upscaled
- **WHEN** the user runs learned upscaling on an image with transparency
- **THEN** the output retains an alpha channel at the output dimensions and can be inspected against light and dark backgrounds

### Requirement: Upscaling work is bounded and recoverable
Before allocating output tensors, intermediate images, or result buffers, the upscaler SHALL validate input dimensions and the supported x4 output dimensions against its documented side and pixel limits. A failed model load, unsupported runtime, failed inference, invalid result, cancellation, or exceeded limit SHALL NOT replace or erase the source or the last completed result. The user SHALL be able to retry or return to conventional resizing. Runtime-specific allocation estimates MAY be used when available; model file size SHALL be informational and SHALL NOT determine whether the feature is available.

#### Scenario: Output would exceed supported dimensions
- **WHEN** selected dimensions and scale exceed the supported output side or pixel limit
- **THEN** the operation is rejected before allocating the large output buffer and the source remains available

#### Scenario: Inference fails
- **WHEN** model execution fails or returns non-finite or wrongly shaped output
- **THEN** the current source and conventional resize result remain available and the user receives a localized recovery option

### Requirement: Quality information is advisory
Learned upscaling SHALL be available without passing image-quality score, model-preference, alpha-edge, or tile-seam thresholds. The interface and documentation SHALL identify the mode as experimental and SHALL explain that learned results can invent detail or introduce artifacts. Quality measurements, when shown, SHALL be advisory and SHALL NOT prevent the user from choosing or downloading a result.

#### Scenario: Model has a known quality regression
- **WHEN** a candidate has a documented quality regression on a fixture or image class
- **THEN** the user can still choose the experimental result and can compare it with the conventional output

### Requirement: Upscaler controls and failures are accessible and localized
Every visible and accessible name for learned-mode selection, model input, progress, cancellation, backend disclosure, comparison, result, and errors SHALL come from complete `pt-BR`, `en`, and `es` message catalogs. Progress and errors SHALL be available to assistive technology, and animations SHALL respect reduced-motion preferences.

#### Scenario: Use learned upscaling in every locale
- **WHEN** the user opens the upscaler in `pt-BR`, `en`, or `es`
- **THEN** all learned-mode controls, status text, error recovery, and accessible names appear in the active locale
