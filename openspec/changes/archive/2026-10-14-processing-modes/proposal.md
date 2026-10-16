## Why

New users are presented with detection tuning controls before they know whether they need them. A simple default path and an explicit advanced mode make the editor easier to approach while keeping the existing refinements available.

## What Changes

- Add automatic and advanced processing modes to the web editor.
- Keep the current background color and tolerance as documented automatic defaults.
- Show background/tolerance tuning and manual split refinement in advanced mode.
- Preserve the loaded image, detected stickers, curation, and export state when switching modes.
- Keep all processing local and add localized, accessible mode controls.
- Out of scope: changing detection algorithms, adding new defaults, or persisting mode selection across sessions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sticker-editor`: define automatic and advanced modes, their controls, defaults, and state-preserving transitions.

## Impact

- Touches `web/` only: tool-page controls, sticker-grid refinement visibility, and localized message catalogs. No core, worker, or dependency changes.
