## Current behavior found

The browser decodes images into RGBA and transfers all four channels to WebAssembly. The Rust foreground mask ignores alpha and classifies only RGB with the selected HSV background thresholds. Sticker extraction then derives output alpha only from component membership, so it can make transparent source pixels opaque and can turn a partially transparent sticker interior fully opaque.

For non-green inputs, the core receives a caller-selected color, but current synthetic integration coverage always paints an opaque green canvas and invokes detection with that key. The HSV threshold works for chromatic uniform backgrounds when the caller supplies the matching color and foreground colors lie outside the selected threshold. It does not robustly distinguish a red sticker from an achromatic gray background because both have hue zero under the current conversion, even at tolerance zero.

## Diagnostic matrix and target boundary

| Synthetic case | Current behavior to record | Contract for follow-up implementation |
|---|---|---|
| Transparent canvas with black hidden RGB, green key, and two stickers | Hidden black is foreground, joins the stickers, and expands the component to the canvas | Alpha-zero pixels are always transparent, independent of stored RGB |
| Same transparent canvas with green hidden RGB | The selected key masks the canvas and the two stickers remain separate | Preserve the result while removing dependence on hidden RGB |
| Green canvas with a partially transparent sticker interior | Source alpha is ignored and the interior becomes opaque | Preserve source opacity and soften boundaries without increasing alpha |
| Blue and magenta uniform canvases with the exact selected key and zero tolerance | Distinct sticker colors remain foreground and separate | Uniform backgrounds of any RGB value are supported at zero tolerance |
| Gray canvas with a red sticker and zero tolerance | Red is removed because hue zero is shared with achromatic gray | Exact-color matching at zero tolerance keeps every different RGB foreground pixel |
| Textured or spatially varying background | Not reliably segmented by the single-color threshold | Remains out of scope for this change and the follow-up #53 |

Tests will generate pixel buffers in memory; no raster files or private image data are needed. The existing green default and nonzero-tolerance HSV behavior remain the compatibility baseline. The follow-up implementation may change the internal classifier, but it must satisfy the observable OpenSpec contract.

## Verification

Run the Rust synthetic integration test and the full Rust tests. Because the diagnostic fixtures live under `core/`, also rebuild the WebAssembly package and reinstall the local package in `web/` as required by `AGENTS.md`. Validate the OpenSpec change strictly before handoff.
