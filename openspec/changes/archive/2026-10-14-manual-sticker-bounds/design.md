## Context

Detection returns a source-image bounding box and a 512x512 transparent RGBA cut-out for each sticker. The editor currently treats those values as immutable. The crop editor can therefore transform the existing cut-out without changing the worker contract or re-running segmentation.

## Goals / Non-Goals

**Goals:** provide a reusable accessible crop editor and a deterministic transformation that keeps the edited source bounds aligned with the exported 512x512 sticker.

**Non-Goals:** modify Rust/WASM segmentation, add freeform masking or erasing, or wire into the tool page/state while those shared files are concurrently edited.

## Decisions

- Keep bounds in source-image pixel coordinates and validate integer, positive dimensions that fit within the decoded image. Reject invalid values rather than silently clamping them.
- Transform the existing transparent 512x512 cut-out from its original detected box into a newly framed 512x512 cut-out. Use premultiplied-alpha bilinear sampling to avoid dark or colored fringes; generate fully transparent pixels as `(0, 0, 0, 0)`.
- Put the controls in a self-contained Svelte component inside a modal launched from each sticker card in Advanced mode. The editor state validates and applies the bounds to the current sticker, which makes the same bounds and pixels flow through the existing source preview and export contracts.
- Use the existing design-system `Card`, `Slider`, and `Button` components; four labeled sliders provide keyboard operation and avoid introducing a raw-input primitive. Keep all user-facing labels, feedback, and preview alternative text in Paraglide catalogs.
- Keep the operation entirely in local memory. No image-derived data is sent over the network.

## Risks / Trade-offs

- The current detector returns a cropped cut-out, not the source-resolution component mask. Expanding a crop beyond that cut-out can add transparent padding but cannot recover pixels omitted by detection; the change only reframes existing sticker pixels and does not claim to improve segmentation.
- Repeated edits can resample the cut-out. The editor should preview from its unmodified input sticker until Apply, and the integration should retain that input while the editor is open.
- Manual edits reframe the current transparent cut-out and preserve the source bounds and pixels together. Any in-flight split proposal for that sticker is discarded so an older crop cannot overwrite the edited result.
