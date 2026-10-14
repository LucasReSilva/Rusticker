## Why

Rusticker currently creates WhatsApp-oriented archives, while Telegram's static sticker workflow requires individual transparent image files prepared for import through Telegram itself. Users need a clearly labeled local export that prepares compliant files without implying that Rusticker can create or upload a Telegram sticker set.

## What Changes

- Add a browser-local export of selected stickers as transparent PNG or WEBP files with one dimension exactly 512 pixels and the other no larger than 512 pixels.
- Bundle the static files in a locale-neutral ZIP and provide localized instructions to continue in Telegram's editor or `@Stickers`.
- Keep export independent from WhatsApp pack metadata, pack-size rules, and platform APIs. The ZIP is only a collection of image files, not a native Telegram sticker set.
- Add an isolated component for integration into the tool page after the concurrent batch-import change is integrated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-export`: define local static Telegram sticker-file export and user-directed import instructions.

## Impact

This change affects `web/` only: a new export module and standalone Svelte component, translations in all supported locales, focused tests, and the `sticker-export` contract. It adds no dependencies, server endpoints, network requests, or changes to Rust/WASM processing.
