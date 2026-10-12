## Why

The detector softens sticker silhouettes but keeps the source RGB at each edge pixel. When an opaque edge pixel contains color from the selected uniform background, that color remains visible as a halo after the pixel becomes partially transparent. The roadmap issue asks for measurable improvement while preserving antialiasing and interior color.

## What Changes

- Add conservative edge-color decontamination in `core/` for pixels with clear evidence of selected-background spill.
- Preserve source alpha, component membership, bounding boxes, and all uncertain edge colors; preserve straight RGB for partially transparent source pixels.
- Add synthetic fixtures that compare edge color with known foreground/background colors and verify unchanged alpha and interior pixels.
- Update the detection behavior contract and `ARCHITECTURE.md` with the limited heuristic and its ambiguity.
- Out of scope: general alpha matting, changing the 3x3 geometric edge coverage, changing background classification, adding editor controls, or sending images off-device.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-detection`: define conservative removal of selected-background color spill at sticker boundaries while preserving alpha and uncertain colors.

## Impact

- Affected code: `core/src/alpha.rs`, its call site in `core/src/lib.rs`, and Rust synthetic/unit tests.
- Affected documentation: `openspec/specs/sticker-detection/spec.md` and `ARCHITECTURE.md`.
- No user-facing API, localization, or browser UI changes. The Rust/WASM package must still be rebuilt and reinstalled after core changes.
- Image processing remains entirely local in the existing Rust/WASM pipeline.
