## Why

Users need a printable way to arrange detected stickers on standard paper without leaving the browser. The existing exports create sticker files and archives, but they do not produce print-ready pages.

## What Changes

- Add a separate PDF sheet export for A4 and US Letter paper in portrait or landscape orientation.
- Let users set page margins and sticker spacing, preview paginated sheets, and optionally move or resize stickers within printable margins.
- Automatically place stickers without overlap while preserving their aspect ratios, adding pages as needed.
- Keep PDF generation local and preserve transparent sticker pixels where the PDF renderer supports transparency.
- Localize every new control, preview label, keyboard instruction, status, and error in all supported locales.
- Keep current WhatsApp, Telegram, and static image exports unchanged.

## Capabilities

### New Capabilities

- `pdf-sticker-sheets`: printable PDF sheet configuration, layout, preview, editing, and download.

### Modified Capabilities

- None.

## Impact

This change touches `web/` only. It adds browser-side page layout and PDF generation, localized controls, and focused tests. It does not send sticker images or derived data over the network and does not modify Rust/WASM or existing export formats.
