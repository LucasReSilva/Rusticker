## Why

The standard Rust/WASM detector correctly keeps connected foreground as one sticker, but some users need help separating two shapes that touch. Issue #54 found that the first MobileSAM ONNX export was incomplete for image-to-mask inference, while the EfficientSAM-Ti model repository publishes a separately versioned encoder and prompt decoder. This change evaluates that complete pair in Rust/WASM first and considers ONNX Runtime Web's CPU/WASM runtime only as a measured fallback. Assistance is exposed only if the selected route passes model, quality, and browser gates.

## What Changes

- Add an explicit, advanced action for a user to request a prompted split of one selected sticker after standard detection.
- Lazily download or load the pinned EfficientSAM-Ti encoder, decoder, and selected inference runtime only after that action; run inference locally in a dedicated worker and report progress and cancellation.
- Let the user mark the regions to separate, review proposed masks, and explicitly accept or discard the result. The original sticker remains available until acceptance and can be restored with undo.
- Preserve source pixels and alpha, reject unsafe or empty proposals, and fall back to the unchanged original result when the runtime, assets, or inference are unavailable.
- Keep model and runtime bytes out of the initial PWA precache. Version model assets, verify their hashes, and report their download size before first use.
- If the pinned model fails `tract` compatibility, browser execution, or synthetic sticker-quality gates, stop before enabling the user-facing action and record the concrete blocker; consider ONNX Runtime Web only for a demonstrated `tract` gap.
- Out of scope: automatic segmentation of every sticker, training or fine-tuning a model, sending user images/prompts off-device, silently replacing results, and publishing a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-detection`: define explicit, user-reviewed ONNX-assisted proposals and their privacy, fallback, cancellation, and source-preservation behavior.

## Impact

- Affected areas: a separate Rust/WASM inference crate, `web/` worker and model-asset lifecycle, editor state and controls, PWA precache rules, localized messages in `pt-BR`, `en`, and `es`, and detection documentation.
- Candidate assets: EfficientSAM-Ti ONNX encoder and decoder from the `yunyangx/EfficientSAM` model repository, pinned to revision `d53228e3f6dee607309453f54a22c40c2a10204c`. Published SHA-256 values are recorded in the design and must be verified before use.
- Expected first-use model download is about 41.4 MB (41,365,489 bytes). The evaluated ONNX Runtime Web CPU/WASM route adds about 14.3 MB of runtime assets, for about 55.7 MB uncompressed in total. No model or inference code should be loaded by the standard detection path.
- User image pixels, prompts, and embeddings remain on-device. Model downloads contain no user-derived data.
