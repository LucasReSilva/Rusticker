## Why

Detected component bounds are useful defaults, but users need a safe way to trim or reframe a sticker when the automatic crop is not the desired one. Manual edits must remain consistent between the source-image outline and the transparent sticker that is exported.

## What Changes

- Add an accessible, localized control in Advanced mode for adjusting a selected sticker's crop in source-image coordinates.
- Apply valid bounds to the sticker's reported box and its 512x512 transparent output together; reject empty or out-of-image bounds without changing the existing sticker.
- Keep the adjustment in the browser and use the edited bounds and pixels in the source preview and export through the editor's existing sticker contract.
- Out of scope: changing segmentation, adding a brush editor, or modifying Rust/WASM detection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-editor`: add manual, accessible crop adjustment with safe bounds validation.

## Impact

This change touches `web/` only. It adds a pure local crop transformation, a reusable editor component mounted from each sticker card in Advanced mode, editor-state integration, tests, and localized messages. The Rust/WASM API and network behavior do not change.
