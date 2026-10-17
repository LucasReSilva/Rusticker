## Why

Users need static image files and archive containers that fit workflows beyond the current WhatsApp ZIP. Add a small set of browser-native choices while keeping existing WhatsApp and Telegram behavior predictable.

## What Changes

- Add optional static sticker image formats PNG, WEBP, and JPEG, with JPEG requiring a chosen flattening background.
- Add ZIP and TAR.GZ containers for the additional static export workflow, with validated filenames and MIME types.
- Preserve the current WhatsApp default archive and contents, pack limits, sizing, and locale-neutral names.
- Keep Telegram's existing PNG/WEBP ZIP export unchanged and describe it only as static files for Telegram's user-controlled import flow.
- Keep all encoding and archive work on-device. Animation, PDF, and network export flows are out of scope.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sticker-export`: specify optional image/archive format choices, JPEG background handling, format validation, and unchanged defaults.

## Impact

This change touches `web/` only. It affects the browser export encoders, archive builder, export controls, localized message catalogs, and sticker-export spec. It adds no dependency: JPEG uses Canvas encoding and TAR.GZ uses a deterministic USTAR writer with the browser Compression Streams API. Rust/WASM and Telegram's current export path remain unchanged.
