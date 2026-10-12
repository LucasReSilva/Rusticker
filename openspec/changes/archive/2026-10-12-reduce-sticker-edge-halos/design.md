## Context

See `proposal.md` for motivation. `core/src/alpha.rs::extract` currently multiplies each source alpha by a 3x3 component-membership coverage and copies the source RGB. `core/src/lib.rs` already receives the selected background color, but extraction does not. `core/src/frame.rs` resamples premultiplied colors and is not the source of the input-edge contamination.

## Goals / Non-Goals

**Goals:**

- Reduce measurable background spill in RGB at opaque sticker boundaries.
- Keep the current geometric alpha coverage, component labels, bounding boxes, ordering, and WASM interface unchanged.
- Apply the same behavior for any selected background color.
- Preserve the current color when evidence is insufficient.

**Non-Goals:**

- Estimate general foreground alpha or perform general alpha matting.
- Infer hidden foreground RGB from partially transparent source pixels.
- Change background classification, sticker detection, or the 3x3 coverage kernel.
- Add a web setting or a new image-processing dependency.

## Decisions

1. **Correct RGB in the crop stage, before framing.** Pass the selected background RGB into extraction. That stage has the source pixels, component labels, and geometric coverage needed to distinguish an edge candidate from the interior. Keep the existing framing and resampling code unchanged.

2. **Require multiple local signals before correction.** A candidate must belong to the component, have source alpha 255, have less than full 3x3 component coverage, and touch a background-labeled pixel with nonzero source alpha. Its reference color comes from full-coverage pixels of the same component within a 5x5 neighborhood whose source alpha is 255. Require at least three anchors and require all anchors to have the same RGB value; otherwise preserve the source color. This prevents a multicolored or textured neighborhood from supplying an arbitrary representative. If the reference equals the selected background, preserve the source color.

3. **Use a bounded RGB mixture estimate.** For candidate color `C`, selected background `B`, and interior reference `F`, solve for one shared `t` in `C = F + t(B - F)` across all three channels, allowing only ±0.5 byte of error for integer rounding. Correct only when the channel intervals share a `t` in `[0, 0.5]`; this means the candidate contains at least as much foreground as background and avoids amplifying noise when background dominates. Recover the foreground estimate as `F` and clamp the resulting byte values. Do not use geometric 3x3 coverage as a physical alpha estimate.

4. **Leave partial-alpha and uncertain pixels alone.** Straight RGBA RGB for a partially transparent source pixel already represents its foreground color; do not unmix it. Do not modify alpha for any pixel. If the local reference or mixture test is uncertain, retain the source RGB.

5. **Use known-color synthetic tests as the acceptance measure.** Generate edge bytes as `qF + (1-q)B` with rounding, for several selected backgrounds and known foreground colors. Measure squared RGB error weighted by the unchanged output alpha over corrected boundary pixels, and require lower error than the current-copy-RGB baseline for each supported fixture. Report the corrected-to-baseline error ratio. Also assert byte-identical alpha, exact interior RGB, partial-alpha preservation, and unchanged transparent-background fixtures.

## Risks / Trade-offs

- A deliberately colored boundary can resemble a mixture of the selected background and nearby interior; the method can alter it. Requiring an adjacent selected-background region, an opaque boundary, a same-component opaque interior reference, a bounded shared mixture fraction, and byte-rounding consistency limits this ambiguity; uncertain cases pass through unchanged.
- Textured stickers may not have a nearby representative interior color. Those edges retain their original RGB, which favors color preservation over aggressive halo removal.
- Multicolored neighborhoods without a majority representative interior color retain their original RGB; the conservative gate can leave some real spill untreated.
- A one-half mixture threshold leaves severe spill untreated when the remaining foreground contribution is too small to recover safely. Keep this limit explicit and testable rather than magnifying noise.

## Migration Plan

No input or output API changes are required. Land the detector change behind existing processing, rebuild and reinstall the WASM package with `bun run build:wasm`, run Rust and browser integration checks, and update the architecture guide. Rollback is a revert of the implementation and contract/documentation commit; no stored data migration is needed.
