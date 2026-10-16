## Context

The source preview already renders the original browser-local object URL with SVG boxes in source coordinates. The Advanced crop editor currently has four integer sliders and a cut-out canvas, but does not receive the source image URL. `adjustStickerBounds` already validates and reframes integer crop bounds without rerunning segmentation. See `proposal.md` for the user problem and `specs/sticker-editor/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:** Preserve the current pixel and export pipeline, provide usable source inspection at multiple magnifications, and let users adjust bounds precisely in the existing dialog.

**Non-Goals:** Reprocess pixels from the original image, add freehand tools, or change segmentation.

## Decisions

- Keep image and overlays inside one scrollable viewport with a common scaled width. Native overflow handles pointer, touch, and keyboard panning, while localized design-system buttons control discrete zoom levels. This avoids a custom transform matrix and keeps image coordinates stable. A custom gesture engine was considered but would add touch and accessibility complexity for little benefit.
- Pass the active source object's URL through Grid and StickerCard into the crop dialog. This URL is already held in browser memory; no new fetch or upload is introduced. The selected card belongs to the active source batch.
- Render the selected crop with a positioned HTML control and fixed-size corner handles above the image. Pointer deltas are divided by the displayed image dimensions to produce source-image pixels, then rounded and clamped. Arrow keys move or resize one pixel; Shift increases the step. Numeric sliders remain the fallback and visible exact-value controls. HTML buttons provide accessible names and focus states that SVG shapes alone lack.
- Share clamping and coordinate arithmetic in a small pure helper so unit tests can cover image-edge and zoom-independent behavior.

## Risks / Trade-offs

- [Large images yield a very large displayed surface at high zoom] -> Cap magnification and use browser-native scrolling, keeping the original image URL rather than copying pixels to new canvases.
- [Touch dragging may scroll instead of editing] -> Use pointer capture and disable touch scrolling only on the crop controls; keep native swipe scrolling elsewhere in the viewport.
- [A source batch switch could make a dialog point to a stale image] -> The dialog is tied to the active card and receives the active source URL reactively; canceling or switching sources unmounts the old card.

## Migration Plan

No data migration is needed. The feature is local to the web client and can be reverted with its feature PR.
