## Why

Rusticker already has a dedicated on-device upscaler with a conventional resize path, but users cannot try learned detail reconstruction. The user wants access to the feature before subjective quality thresholds are settled, so this change adds an explicit experimental mode while keeping the conventional result available for comparison and preserving the local-only privacy model.

## What Changes

- Add an opt-in learned upscaling mode to the existing dedicated upscaler page. Conventional resizing remains the default and works without loading the model runtime.
- Let the user choose a compatible ONNX model file from their device. Do not bundle or automatically download a model while artifact-specific redistribution rights are unresolved.
- Execute model inference in an isolated CPU/WASM worker. Prefer the Rust/WASM runtime when it supports the graph; use the evaluated browser ONNX Runtime WASM backend as the experimental fallback and identify the selected backend in the interface and documentation.
- Define and validate the first supported model contract: RGB float NCHW input and RGB 4x output, with supported shapes checked before processing. Keep the source alpha on a separate resizing path.
- Show progress, cancellation, retry, model and output dimensions, and localized recoverable errors. Keep quality metrics and known visual limitations advisory; they do not block use of the feature.
- Bound image dimensions and output allocation before inference. Preserve the source and conventional-resize path when model loading or inference fails.
- Keep all user-visible text complete in `pt-BR`, `en`, and `es`; keep user images and model bytes on-device.
- Out of scope: bundling or hosting model weights, automatic model discovery/download, cloud inference, model training/conversion, sticker animation, and changing the sticker detection/export pipeline.

## Capabilities

### New Capabilities

- `image-upscaling`: Optional experimental ONNX inference and comparison in the existing local image upscaler.

### Modified Capabilities

- `localization`: Add the upscaler's experimental model controls, runtime status, errors, accessibility labels, and route contract to all supported locale catalogs.
- `offline-install`: Keep the conventional upscaler functional offline and make the app-owned CPU/WASM runtime assets available offline after the app has cached them; user-selected model files remain local and are not cached by the service worker.

## Impact

Touches `web/` only: the existing `web/src/routes/upscaler/` page, its image-processing worker and tests, Paraglide catalogs and route contracts, and the production dependency/build configuration for an on-demand ONNX Runtime Web WASM fallback. The existing Rust core and sticker detection APIs are unchanged because the evaluated `tract` candidate cannot analyze the chosen dynamic graph. No model bytes or user image data are added to application assets or network requests.
