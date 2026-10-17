## Why

Automatic detection can miss sticker content, while the current workspace only lets users inspect existing boxes and refine or split detected stickers. Users need to create and manage candidates directly against the original image so the visible source boxes, transparent previews, and downloaded files stay consistent.

## What Changes

- Add manual candidate creation, repositioning, resizing, reviewed splitting, and removal in the full-source workspace, preserving the existing zoom, pan, source-coordinate overlay, bounds, and split review behavior.
- Keep all candidate edits transactional: invalid geometry leaves the current result untouched, accepted edits can be undone or reverted, and every kept candidate's source box and transparent pixels feed previews and exports.
- Add localized, accessible controls for pointer, touch, and keyboard use in every supported locale, including reduced-motion behavior.
- Implement the change in `web/`; do not change `core/`, detection semantics, or export formats. All source pixels remain in browser memory.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-editor`: Define manual creation and editing of candidates over the original source, reviewed splitting, safe removal, undo/revert, and synchronized preview/export behavior.

## Impact

Affected areas are `web/src/lib/state.svelte.ts`, the source inspector and editor components, localized message catalogs, and their tests. No worker API, Rust/WASM code, dependency, or network behavior changes are required.
