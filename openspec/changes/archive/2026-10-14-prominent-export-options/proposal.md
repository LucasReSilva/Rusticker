## Why

After detection, users must currently reach the sticker grid before they see the export actions. Moving those actions above the grid makes the next step clear and keeps the main downloads within reach on small screens.

## What Changes

- Move the WhatsApp pack and Telegram static-file export controls to the top of the editor's curation column, before the sticker grid.
- Keep the editor and export controls usable at viewport widths of 375 pixels and above without horizontal page overflow.
- Update focused unit and browser coverage for the new order and responsive layout.
- This change touches `web/` only. It does not change export formats, processing, or localization content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-editor`: require export controls to precede the curation grid and remain accessible on narrow viewports.

## Impact

The tool page's editor layout and its unit and Playwright coverage change. No API, dependency, server, or Rust/WASM changes are needed.
