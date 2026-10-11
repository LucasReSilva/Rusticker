## Why

After `design-tokens` and `wasm-worker`, the app has a themed component library and a working in-browser detector, but the tool page at `/` is still a placeholder: a user cannot load an image, see what was detected, tune the detection, or curate the result. This change builds the interactive sticker editor so the product is usable end to end up to the export step, which `whatsapp-export` adds in parallel.

## What Changes

This change touches **`web/` only**. It does not modify `core/`, the detection runtime (`web/src/lib/detection/**`), or any design-system component.

- Add an editor state store (`web/src/lib/state.svelte.ts`, Svelte 5 runes) holding the source image, detected stickers, tolerance, background color, chosen tray-icon sticker, removed stickers, processing status and last error; it drives detection through the `Detector` interface with a debounce for tolerance changes and discards stale results. The app uses one lazily created module-scope instance, so switching language (which re-renders the page without a reload) keeps the image, stickers, removals and tray-icon choice.
- Add feature components in `web/src/lib/components/`, composed only of design-system components and theme tokens:
  - `DropZone.svelte` – load an image by drag and drop, click to choose, or Ctrl/Cmd+V paste; hover and dragging states; non-image files rejected with a toast.
  - `Preview.svelte` – the original image with the detected boxes drawn over it, and an eyedropper (explained by a tooltip) to pick the background color with the pointer or the keyboard (arrow keys move a crosshair, Enter picks, Escape cancels).
  - `Controls.svelte` – the tolerance slider with live, debounced re-detection, the current background color, and progress feedback while processing.
  - `Grid.svelte` + `StickerCard.svelte` – cut-out stickers on the checkerboard, each with a size badge (placeholder until `whatsapp-export` reports a size), a remove action with a confirmation dialog, and a "use as tray icon" action; full keyboard navigation (roving focus, arrow keys, Home/End, Delete to remove).
- Add small pure helpers in a new folder `web/src/lib/tool/` (image decoding to `ImageData`, eyedropper sampling and crosshair stepping, grid focus navigation) so they can be unit-tested without a browser canvas, plus `size.ts` with the shared `StickerSizeInfo` type.
- Add `web/src/lib/format.ts`: locale-aware number, kilobyte and percent formatting (shared API, also used by `whatsapp-export`).
- Compose the tool page (`web/src/routes/+page.svelte`, `+page.ts`) for every locale, mobile-first and robust to long strings, with a clearly marked mount point for `<Export>` and the props it will receive.
- Detection failures (`NoStickers`, `ImageTooLarge`, `InvalidInput`, `WorkerFailed`) are shown as localized toasts using the existing `error_*` messages; tool-specific failures (unsupported file, undecodable image) use new `tool_*` messages.
- Add `tool_*` messages (labels, `aria-label`s, `alt` texts, tooltips, pluralized counts) to `pt-BR`, `en` and `es`.
- Component and unit tests with vitest against `createMockDetector()` (no wasm needed).
- Docs: tool UI sections of `DESIGN.md` and `README.md`; one CHANGELOG bullet.

Out of scope (even though the brief mentions them nearby):
- `Export.svelte`, WEBP encoding, real KB sizes, pack splitting / `TooManyStickers` notice, tray-icon PNG generation and the zip download (owned by `whatsapp-export`, which mounts `<Export>` in the page in its last task).
- `LanguageSwitcher`, `ThemeToggle` and the header (owned by `design-tokens`); the page `<title>`/meta (owned by `web-scaffold` / `pwa-seo`).
- Any change to the detection algorithm, the wasm API, the worker, or the `error_*` messages (owned by `core-detection` / `wasm-worker`).
- Splitting touching stickers, non-uniform backgrounds, RTL locales, undo of removals.
- Committing or copying the sample image into the repository.

## Capabilities

### New Capabilities
- `sticker-editor`: how a user loads an image (drop, choose, paste), sees detected stickers outlined on the original, picks the background color with an eyedropper (pointer or keyboard), tunes tolerance with live re-detection, removes stickers with confirmation, chooses the tray-icon sticker, navigates the sticker grid by keyboard, and sees localized errors and counts.

### Modified Capabilities
<!-- none -->

## Impact

- **Wave:** C (branch `feature/tool-ui`). **Depends on:** `design-tokens` and `wasm-worker` merged to `develop` (and transitively `web-scaffold`, `core-detection`). Runs in parallel with `whatsapp-export`. `whatsapp-export`'s final task (mounting `<Export>` in the tool page) runs after this change is merged.
- **Files owned (create/modify):** `web/src/lib/state.svelte.ts`; `web/src/lib/components/{DropZone,Preview,Controls,Grid,StickerCard}.svelte`; `web/src/routes/+page.svelte` and `web/src/routes/+page.ts`; `web/src/lib/format.ts`; `web/src/lib/tool/**` (new; accepted in the contract reconciliation); co-located `*.test.ts` files; Playwright specs `web/e2e/tool-ui/**`; keys `tool_*` in `web/messages/{pt-BR,en,es}.json`.
- **Consumes (read-only):** `web/src/lib/detection/**` (`Detector`, `Sticker`, `DetectionError`, `createDetector`, `createMockDetector`, error-message mapping); `web/src/lib/components/ui/**`; theme tokens including the checkerboard utility.
- **Shared API published for `whatsapp-export` (contract addendum R6):** `format.ts` (`formatNumber`, `formatKilobytes`, `formatPercent`); `StickerSizeInfo` in `web/src/lib/tool/size.ts` and the optional `sizeOf` prop on `Grid`/`StickerCard`; `editor.stickers`, `editor.trayIconId`, `editor.isProcessing`; the `<!-- @whatsapp-export:mount -->` marker inside `<section data-slot="export">` in the tool page.
- **Dependencies:** none. Component tests use the `client` Vitest project that `web-scaffold` already provides (addendum R4); the Vitest config is not edited.
- **Docs:** tool UI sections of `DESIGN.md` and `README.md`; one bullet in `CHANGELOG.md` under Unreleased.
- **Privacy:** images are read with browser file APIs and processed in memory and in the worker; no network requests carry user data.
