## Why

Static and Telegram exports repeat format selection, while the WhatsApp controller and session independently compare the same input identities. Centralizing these decisions reduces the chance that export paths diverge during maintenance.

## What Changes

- Apply the Strategy pattern to PNG, WEBP, and JPEG encoding using small typed functions shared by static and Telegram exports.
- Centralize capture and comparison of export inputs for cache invalidation and stale-download protection.
- Preserve public APIs, encoder arguments, output names, MIME validation, progress, error codes, and cancellation behavior.
- Scope: `web/` and OpenSpec artifacts only. Rust changes, new formats, UI changes, dependencies, network operations, and unrelated architecture changes are out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a behavior-preserving refactor (`skip_specs: true`). Existing sticker-export requirements and the static-export-formats delta remain authoritative.

## Impact

Changes are limited to `web/src/lib/export/` and architecture documentation. Existing callers retain their interfaces, and user pixels and archives remain browser-local. Regression coverage will verify format dispatch, errors, session identity, and stale export cancellation.
