## Why

Users need control over the sequence of stickers in the final pack instead of being limited to detector order.

## What Changes

- Preserve detection order as the initial order, then allow kept stickers to be moved into a custom sequence.
- Carry the custom sequence through the grid and export, while preserving the existing tray-icon identity.
- Support pointer reordering and an accessible keyboard interaction with localized feedback.

## Capabilities

### Modified Capabilities

- `sticker-editor`: the visible and exported kept-sticker sequence becomes user reorderable.

## Impact

The change affects editor ordering and export input in `web/`. Detection geometry and sticker pixels are unchanged. The ordering implementation must remain compatible with removal, split/undo, batch processing, and tray-icon selection.
