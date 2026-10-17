## Why

Rusticker currently accepts a still image and exports static WebP stickers, while the roadmap is considering animated media. Browser codec support varies by container, codec, API, device, and hardware; choosing an input matrix or shipping a local codec before measuring those differences risks broken imports, oversized bundles, and false compatibility claims.

## What Changes

- Evaluate browser-local decoding of GIF, animated WebP, APNG, MP4, and WebM and encoding of WhatsApp animated WebP and Telegram VP9 WebM profiles using reproducible generated fixtures.
- Compare native browser APIs with optional local WASM codec paths for frame access, alpha, timing, audio removal, encoding, cancellation, peak memory, initial bundle cost, and offline operation.
- Publish an evidence-based recommendation, supported input/output matrix, validation limits, reproducible commands, exact tested browser/codec versions, and explicit unresolved gaps.
- This is documentation and evaluation work in `web/` and `docs/` only; it does not change `core/` or production `web/` behavior.
- Out of scope: shipping a codec, runtime, new media import/export product flow, remote service, analytics, private/user media, or claims that a generated file imports successfully without testing an identified official importer workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records feasibility and format constraints without changing product behavior. `.openspec.yaml` sets `skip_specs: true`.

## Impact

- Add a reproducible technical evaluation under `docs/` and link it from the existing architecture or roadmap documentation.
- Use standards and platform documentation plus generated synthetic media; record which browser/platform tests were actually run and which remain blocked.
- No runtime dependencies, codec assets, production bundle, WASM interface, or user-data flow changes.
