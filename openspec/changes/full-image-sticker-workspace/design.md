## Context

The source inspector displays the original image and source-coordinate SVG boxes. `EditorState` owns the source image, detected sticker records, curation order, removals, and accepted split undo groups. `Sticker` pairs a source-image bounding box with a transparent 512x512 image consumed by cards and exports. Existing bounds adjustment reframes the current pixels, while split proposals operate on an individual sticker image. See proposal.md and specs/sticker-editor/spec.md for the behavior contract.

## Goals / Non-Goals

**Goals:** Make source-image edits transactional and keep source boxes, sticker pixels, curation, preview, and export state in sync. Preserve current detection, split review, bounds controls, and privacy behavior.

**Non-Goals:** Change the Rust detector or worker protocol, add freehand pixel painting, or change export formats.

## Decisions

- Keep accepted candidate state in `EditorState`, the same owner used by the grid and export controller. Add a single source-box validation and regeneration path so preview and export consumers continue receiving ordinary `Sticker` values.
- Derive a candidate's transparent pixels by running the existing browser-local detector on a copy of the selected source rectangle with the current background and tolerance. Translate returned source bounds into the original image coordinate system; do not crop by stretching an old sticker image when its source box changes. A failed or empty detection rejects the edit without replacing the current candidate.
- Keep split proposals separate from accepted state and require explicit acceptance, matching the existing review flow. Map proposed local bounds back into source coordinates and validate every candidate before replacing the source.
- Model add, bounds replacement, removal, accepted split, undo, and revert as editor-state operations that update order, tray icon, split ancestry, and batch snapshots together. Keep full-source hit testing and drawing in source coordinates so zoom level does not change edit geometry.
- Use accessible buttons and numeric bound controls as keyboard alternatives to pointer/touch drawing and handle dragging. Keep labels and announcements in Paraglide catalogs; honor reduced motion through existing motion-safe/reduce token patterns.

## Risks / Trade-offs

- [Segmenting a manually selected rectangle may return no candidates or multiple regions] → Keep the existing state until a valid result is returned and require users to review candidates before accepting them.
- [Edits can invalidate split history, custom order, or the tray icon] → Centralize accepted state transitions and cover replacement, removal, undo, and batch export snapshots with focused tests.
- [Large source rectangles increase local detector work] → Process only a copied bounded rectangle and reject invalid geometry before dispatch; keep the worker input local.
- [Pointer geometry can drift when the source inspector is zoomed or panned] → Convert client positions through the rendered image rectangle into integer source coordinates and test at non-default zoom and image edges.
