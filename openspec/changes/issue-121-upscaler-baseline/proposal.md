## Why

Rusticker needs a separate tool for enlarging one image without running sticker-sheet detection. The current ONNX evaluation has not approved a learned model, so users need a useful, clearly labeled browser-resampling baseline while learned reconstruction remains unavailable.

## What Changes

- Add a localized upscaler page with image selection, original/result preview, a scale control with output-dimension feedback, progress, cancellation, retry, and local PNG download.
- Bound source and output dimensions before image decoding or output allocation, preserve the source after failure, and keep all image work on-device.
- Clearly identify the available method as conventional browser resampling; do not expose learned upscaling until a separate evaluation approves a specific model and runtime.
- Add the page to localized routes and shared navigation in all supported locales.
- Out of scope: ONNX/model integration, animated media, batch upscaling, and changes to existing sticker processing or export.

## Capabilities

### New Capabilities
- `image-upscaling`: Local, bounded conventional upscaling for a single static image.

### Modified Capabilities
- `localization`: Add translated upscaler URL slugs and ensure generated links preserve the active locale.
- `web-app-shell`: Add a localized browser-only upscaler page and shared navigation link.

## Impact

- Web only: new route, worker and image-dimension validation, preview and controls, shared navigation, route table, message catalogs, and tests.
- No changes to `core/`, no new runtime dependency, no server endpoint, and no network requests containing user data.
