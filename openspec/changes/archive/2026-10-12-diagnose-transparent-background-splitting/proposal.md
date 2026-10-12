## Why

The browser preserves input alpha, but the detector currently classifies and extracts pixels using RGB and replaces source opacity with a component-derived mask. A uniform background also depends on the selected color and HSV thresholds, so transparent hidden RGB and some non-green colors can merge stickers or erase foreground. These cases need reproducible, privacy-safe boundaries before detector behavior changes.

## What Changes

- Add synthetic detector cases for fully and partially transparent input, multiple opaque uniform background colors, and an achromatic-background edge case.
- Record which input cases the next implementation should support and which remain out of scope; preserve existing green-screen behavior.
- Do not change detector behavior, upload private images, or introduce a general non-uniform-background segmentation algorithm in this diagnostic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-detection`: define alpha handling expectations and the supported uniform-background input envelope for follow-up implementation.

## Impact

- `core/tests/synthetic.rs` gains generated RGBA scenes only; no image fixture files or user pixels are added.
- OpenSpec delta updates the detector contract. Rust implementation and Web UI behavior are unchanged in this diagnostic change.
