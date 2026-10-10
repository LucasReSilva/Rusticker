## Why

After `tool-ui`, a user can detect and curate stickers but cannot take them anywhere: there is no way to produce the files WhatsApp accepts. This change closes the product loop by turning the detected 512x512 stickers into downloadable, WhatsApp-ready packs (size-limited WEBP files, a tray icon, valid pack sizes), entirely in the browser.

## What Changes

- **Touches `web/` only.** No change to `core/` (the Rust crate already returns 512x512 transparent RGBA stickers; lossy WEBP encoding is done by the browser).
- Add a pure TypeScript export library under `web/src/lib/export/`, testable without any UI:
  - Encode each sticker as a 512x512 transparent WEBP, automatically lowering the quality until the file is at most 100 KB (100,000 bytes); stickers that cannot reach the budget even at the minimum quality are flagged with an over-budget warning instead of silently failing.
  - Generate a 96x96 transparent PNG tray icon from the sticker the user chose, defaulting to the first sticker when none is chosen.
  - Split stickers into packs of 3 to 30: more than 30 stickers become several balanced packs (e.g. 31 -> 16 + 15) so no pack has fewer than 3; fewer than 3 stickers in total blocks the export with a localized explanation.
  - Build one zip per pack with locale-neutral names (`rusticker-pack-1.zip`, `sticker_01.webp`, `png/sticker_01.png`, `tray_icon.png`).
  - Expose per-sticker encoded size so the sticker cards can show a KB badge.
- Add `Export.svelte`: the primary "Download pack (.zip)" action with disabled states, encoding progress, an informational notice when the stickers will be split into several packs, per-pack download buttons when split, and success / warning / error toasts.
- Add the `export_*` messages in pt-BR, en, and es, using parameters and plurals.
- Add the `jszip` dependency to `web/package.json`.
- Final integration task (runs after `tool-ui` is merged): replace the tool page's `<!-- @whatsapp-export:mount -->` marker with `<Export>` and pass `sizeOf={stickerSizes.get}` to the sticker grid.
- Docs: the WhatsApp section of `ARCHITECTURE.md` and one CHANGELOG bullet.

Out of scope (the brief could be read as including them):
- Animated stickers, sticker emojis/tags, pack name/author metadata files (`contents.json`, `author.txt`): WhatsApp only reads these through third-party importer apps or the native SDK; Rusticker ships plain files.
- Direct "Add to WhatsApp" integration (intents, deep links, native SDK).
- A wasm/JS WEBP encoder fallback for browsers whose canvas cannot encode WEBP (such browsers get a localized error; see design.md).
- Any change to detection, the tolerance controls, or the grid's remove / choose-tray-icon actions (owned by `tool-ui`).
- A `TooManyStickers` error code: splitting is an informational notice, not an error.

## Capabilities

### New Capabilities
- `sticker-export`: turning the current set of detected stickers into WhatsApp-ready packs: per-sticker WEBP format and size budget, tray icon, pack-size and splitting rules, archive layout and locale-neutral file names, size reporting, and the user feedback around exporting (disabled states, progress, notices, toasts).

### Modified Capabilities
<!-- None. -->

## Impact

- **Wave C**, branch `feature/whatsapp-export`. Requires `web-scaffold`, `design-tokens`, and `wasm-worker` merged (uses `Sticker` from `web/src/lib/detection/types.ts`, `createMockDetector()` for tests, and the Button, Progress, Badge, and Sonner components). Runs in parallel with `tool-ui`; its last integration task runs after `tool-ui` is merged.
- **Files owned (create/modify):** `web/src/lib/export/**`, `web/src/lib/components/Export.svelte`, `export_*` keys in `web/messages/{pt-BR,en,es}.json`, the `jszip` dependency in `web/package.json` / `web/bun.lock`.
- **Files touched outside ownership, final task only:** the tool page `web/src/routes/+page.svelte` (mount `<Export>` and pass the size lookup to the grid), as allowed by the shared contract; `ARCHITECTURE.md` section 8; `CHANGELOG.md` (one bullet under Unreleased).
- **Consumes from `tool-ui` (shared contract addendum R6):** the `StickerSizeInfo` type in `web/src/lib/tool/size.ts` (a structurally identical local copy with a type-compat test is used until `tool-ui` merges), the `sizeOf` prop on `Grid`/`StickerCard`, `editor.stickers` / `editor.trayIconId` / `editor.isProcessing`, and the `<!-- @whatsapp-export:mount -->` marker in the tool page. The KB badge is formatted by `tool-ui` with its own Intl helpers.
- **Privacy:** all encoding and zipping happens in the browser; downloads use local blob URLs. No network requests.
