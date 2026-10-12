## Context

See the archived `diagnose-transparent-background-splitting` change for reproduced inputs and the current behavior contract in `openspec/specs/sticker-detection/spec.md`. The decoded RGBA buffer reaches the Rust core unchanged. The detector's mask currently reads RGB only, and alpha extraction derives opacity solely from region membership.

## Goals / Non-Goals

**Goals:** honor source alpha, preserve the established 3x3 edge softening, and implement exact RGB matching at zero tolerance without changing nonzero HSV thresholds.

**Non-Goals:** estimate alpha matting, decontaminate foreground color, infer a background color, or segment textured/non-uniform backgrounds.

## Decisions

- Treat source alpha 0 as background before evaluating RGB. Pixels with alpha greater than 0 continue through the selected-background classifier.
- Multiply each source pixel's alpha by the existing 3x3 component coverage, rounded to the nearest integer. This preserves current output for opaque inputs and prevents neighboring region coverage from making a transparent source pixel visible.
- Store the selected RGB and tolerance in the threshold value. Use exact RGB equality only at tolerance 0; keep the HSV path unchanged for tolerances 1 through 100.
- Characterize behavior through the public detector API and pure in-memory RGBA scenes. Keep opaque green, chromatic non-green, partial alpha, and achromatic-background cases as separate regressions.

## Risks / Trade-offs

- [Low-alpha edge pixels can be removed by background classification before extraction] → Keep nonzero-tolerance HSV semantics unchanged and cover alpha-preservation with pixels whose RGB lies outside the selected background threshold.
- [Transparent gaps can alter component topology and size filtering] → Test fully transparent surroundings, transparent pixels inside bounding boxes, and opaque baseline scenes.
- [A zero-tolerance comparison can change same-hue pixels that previously matched HSV bounds] → This is the documented exact-match contract; preserve and test the nonzero tolerance green behavior.

## Migration Plan

No data migration is needed. The change is local to the Rust core and can be reverted by reverting its commit if regression tests reveal incompatibility.
