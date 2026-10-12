## Why

Connected stickers currently become one output, while the watershed evaluation found useful splits for simple overlapping shapes and clear false splits for rings and ambiguous silhouettes. Users need an explicit, reviewable assist that preserves the current automatic result unless they choose and accept a proposed split.

## What Changes

- Add a user-invoked, on-device split proposal for a selected sticker; keep standard detection and export behavior unchanged until the proposal is accepted.
- Let the user accept or discard a proposal while retaining the original sticker for undo/recovery.
- Keep proposal generation deterministic and bounded; ambiguous or unsupported cases return the unchanged sticker.
- Out of scope: automatic splitting during detection, an ONNX model, changing background classification, or treating the evaluation harness as accuracy evidence for arbitrary artwork.
- This change touches `core/` and `web/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-detection`: define the opt-in proposal and acceptance contract while preserving default 8-connected detection.

## Impact

The Rust crate and WASM API gain an explicit proposal path; the worker and Svelte editor expose an action and review/accept/discard flow, with localized text in all supported catalogs. No new runtime dependency or network access is required.
