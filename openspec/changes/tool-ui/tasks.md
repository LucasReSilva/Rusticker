## 1. Setup

- [x] 1.1 Work on branch `feature/tool-ui` (Wave C, own worktree) created from `develop` only after `design-tokens` and `wasm-worker` are merged (and therefore `web-scaffold` and `core-detection`); runs in parallel with `whatsapp-export`. Verify `git log develop --oneline` shows those merges, and that `web/src/lib/detection/{types,index,mock,messages}.ts` and `web/src/lib/components/ui/{card,slider,tooltip,badge,dialog,progress,skeleton,button,sonner}` exist in the worktree
- [x] 1.2 Build and install the wasm package so the real app runs locally: `bun run build:wasm` in `web/`; verify `bun run dev` serves `/` (still the placeholder) without errors
- [x] 1.3 Confirm the `client` Vitest project from `web-scaffold` (jsdom + Svelte testing helper, contract addendum R4) picks up `*.svelte.test.ts` files; do not edit the Vitest/Vite config or add test devDependencies; verify `bun run test` lists both the `server` and `client` projects

## 2. Shared helpers

- [x] 2.1 Write `web/src/lib/format.ts` (`formatNumber`, `formatKilobytes` with 1 KB = 1000 bytes, `formatPercent`, locale defaulting to the active Paraglide locale, cached formatters) per design D11, plus `format.test.ts` covering pt-BR, en and es separators, KB rounding (e.g. 99_500 bytes, 1_234_500 bytes) and percent; verify `bun run test` and `bun run check` pass
- [x] 2.2 Write `web/src/lib/tool/decode.ts` (`decodeImage(blob)` via `createImageBitmap` + `OffscreenCanvas`, orientation from image, `bitmap.close()`, failure mapped to `DecodeFailed`) per design D3; verify `bun run check` passes (exercised in the browser in task 7.3)
- [x] 2.3 Write `web/src/lib/tool/eyedropper.ts` (`moveCrosshair` with step `max(1, round(min(w,h)/100))`, Shift x10, clamped; `sampleColor` 3x3 average clipped at edges; `toHex`) plus `eyedropper.test.ts` (corners, edges, step sizes, averaging); verify `bun run test` passes
- [x] 2.4 Write `web/src/lib/tool/size.ts` exporting exactly `StickerSizeInfo` from contract addendum R6 (`pending` | `ready` with `bytes` and `overLimit` | `error`) and nothing else; verify `bun run check` passes
- [x] 2.5 Write `web/src/lib/tool/grid-nav.ts` (`nextIndex(current, key, count, columns, rtl)` for Left/Right/Up/Down/Home/End) plus `grid-nav.test.ts` (first/last clamping, partial last row, RTL swap, 1 column); verify `bun run test` passes

## 3. Messages

- [x] 3.1 Add every `tool_*` key listed in design D12 to `web/messages/pt-BR.json`, `en.json` and `es.json` with real translations, using the plural variant syntax for `tool_detected_count` (one/other) and parameters for positions, totals, sizes and colors; add only `tool_*` keys; verify `bun run i18n:check` and `bun run check` pass

## 4. Editor state

- [x] 4.1 Write `web/src/lib/state.svelte.ts` (`EditorState`, `createEditorState({ detector, decode?, debounceMs? })`) per design D1: source image with object URL, `detected` as raw state, kept `stickers` derived, `removedIds`, tolerance 50, background `{ r: 0, g: 177, b: 64 }`, tray icon, status, last error with a sequence number, `isProcessing` (true during decode, detection and a pending debounce); the lazy singleton `getEditor()` and test-only `setEditorForTesting()` (design D1, addendum R7); `loadFile`, `setTolerance` (300 ms debounce), `setBackground` (immediate), `removeSticker` (tray fallback), `setTrayIcon`, `dispose`; ignore `isCancelled` rejections and stale sequence results; verify `bun run check` passes
- [x] 4.2 Write `state.svelte.test.ts` with `createMockDetector()`, a fake `decode` and fake timers covering the cases listed in design D13 (load, unsupported file keeps previous image, decode failure, tolerance burst -> one call with the last value, background cancels debounce, `failWith: 'NoStickers'`, cancellation ignored, tray default and fallback, re-detection clears removals, `isProcessing` across decode/debounce/detection, `getEditor()` identity and `setEditorForTesting` reset, `dispose` revokes the URL and disposes the detector); verify `bun run test` passes

## 5. Feature components

- [x] 5.1 Write `DropZone.svelte` per design D2/D4 (Card as keyboard-operable button, hidden file input `accept="image/*"`, hover/dragging states via `data-state` with a drag depth counter, first image of multiple files, `onFile`/`onReject`, compact variant, `motion-safe:` transitions, logical utilities only) plus `DropZone.svelte.test.ts` (Enter/Space opens the chooser, dragging state on enter/leave, non-image calls `onReject`, image calls `onFile`); verify `bun run test` and `bun run lint` pass
- [x] 5.2 Write `Preview.svelte` per design D5 (img + SVG overlay in source-pixel `viewBox`, non-scaling strokes with token classes, eyedropper toggle with Tooltip and `aria-pressed`, pointer pick, keyboard crosshair with arrows/Shift/Enter/Space/Escape, focus return, live-region announcement) plus `Preview.svelte.test.ts` (one rect per box at the bbox coordinates, keyboard pick emits `onPick` with the sampled color, Escape emits nothing and refocuses the toggle, crosshair clamped); verify `bun run test` passes
- [x] 5.3 Write `Controls.svelte` per design D6 (Slider 0-100 step 1 with label, percent value and `aria-valuetext` via `formatPercent`, help text, background swatch with hex code, indeterminate Progress while busy) plus `Controls.svelte.test.ts` (arrow key changes the value and calls `onToleranceChange`, percent text in en and pt-BR, Progress shown only when busy); verify `bun run test` passes
- [x] 5.4 Write `StickerCard.svelte` per design D9 (canvas on `bg-checkerboard` with `role="img"` and localized label, optional `sizeOf` prop rendering the badge per `StickerSizeInfo` as in design D9a, tray-icon toggle with `aria-pressed` and badge, remove button with Tooltip and confirmation Dialog, roving `tabindex` on the card and its actions); verify `bun run check` and `bun run lint` pass
- [x] 5.5 Write `Grid.svelte` per design D8 (focusable heading, list layout `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, roving tab stop remembered across Tab out/in, arrow/Home/End navigation using `grid-nav.ts` with columns measured from layout, Delete/Backspace opens the remove dialog, focus after removal to next/previous/heading, Skeleton cards while pending, empty-state message, `aria-busy`, optional `sizeOf` forwarded to each card) plus `Grid.svelte.test.ts` covering the keyboard and focus scenarios of the spec (arrows, Home/End, single tab stop, Delete opens dialog, confirm removes and focuses next, cancel keeps all and refocuses the remove action, last removal focuses heading, tray badge and `aria-pressed`, size badge absent without `sizeOf` and correct for each `StickerSizeInfo` state including `overLimit` and `error`); verify `bun run test` passes

## 6. Tool page

- [x] 6.1 Compose `web/src/routes/+page.svelte` per design D10 (`const editor = getEditor()`, never disposed by the page so a locale remount keeps the state; window paste listener added on mount and removed on destroy; `<Grid>` without `sizeOf`; mobile-first single column, `lg:` two columns; count live region with `tool_detected_count`; toasts per design D7 via `detectionErrorMessage` and `tool_error_*`; the `<section data-slot="export">` containing only the `<!-- @whatsapp-export:mount -->` marker, per contract addendum R6) and keep `+page.ts` with `ssr = false`; verify `bun run check`, `bun run lint` and `bun run build` pass
- [x] 6.2 Write `web/src/routes/page.svelte.test.ts` (page with a mock-backed editor injected via `setEditorForTesting`: loading an image renders N cards and the pluralized count; `failWith: 'NoStickers'` shows the localized error text in pt-BR, en and es and an empty grid; pasting a non-image shows the unsupported-file message; unmount + remount of the page after removing a sticker and choosing a tray icon keeps the image, kept stickers and tray choice; the `@whatsapp-export:mount` marker is inside `section[data-slot=export]`); verify `bun run test` passes
- [x] 6.3 Audit the new files against DESIGN.md: no raw colors except the documented swatch custom property, no `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` utilities, no arbitrary px values, no literal user-visible strings; verify with `rg -n "\b(ml|mr|pl|pr|left|right)-|text-(left|right)|#[0-9a-fA-F]{3,6}\b|\[[0-9]+px\]" web/src/lib/components/{DropZone,Preview,Controls,Grid,StickerCard}.svelte web/src/routes/+page.svelte` returning no matches (or only justified ones), and `bun run lint` passing

## 7. End-to-end verification

- [x] 7.1 Run the full web pipeline from `web/`: `bun run check`, `bun run lint`, `bun run test`, `bun run i18n:check`, `bun run build`; verify all pass and `git status --porcelain` shows only files owned by this change and no image files
- [ ] 7.2 Optional manual visual check with `bun run dev:all` and the local sample image (path from `RUSTICKER_SAMPLE_IMAGE`, never copied into the repo): look and layout in dark theme, narrow width and reduced motion. Every behavior is automated by task 7.3.

- [x] 7.3 Add Playwright specs under `web/e2e/tool-ui/` covering: drop, click and paste upload of a synthetic image (`setInputFiles`, dispatched drop and paste events); boxes drawn at the detected count; keyboard eyedropper sets the background; a tolerance change re-detects once after the pause; Delete then confirm removes a sticker and cancel keeps it; tray icon toggle with `aria-pressed`; roving-tabindex arrow/Home/End navigation; curated state kept across a language switch without reload; no request outside the app origin; no horizontal overflow at 375px in dark theme. Verify `bun run test:e2e` passes locally and in the pre-wired CI step.

Verification: PR #11 CI run 38150720016 passed all checks, including 274 unit tests and 67 browser tests. The fresh worker offline test passed; only the private sample browser test was skipped.

## 8. Docs

- [x] 8.1 Update the tool UI parts of `DESIGN.md` (feature components: final names and keyboard model of the Grid and eyedropper, the `tool_*` key prefix, the swatch exception) and `README.md` (a short "Using the tool" description of load/eyedropper/tolerance/remove/tray icon), and add one bullet under Unreleased in `CHANGELOG.md`; verify `git diff --stat` touches only those sections and the change's own files, and `openspec validate tool-ui --strict` still passes

## Verification evidence

- Built and reinstalled the local wasm package with Bun 1.3.14. Kept the inherited tool route's `ssr = false`, `prerender = true` and trailing-slash shell behavior from the integrated scaffold.
- The web type, formatting, ESLint, catalog and design-token checks pass. The full Vitest run passed 274 tests across 34 files; the existing sample-dependent tests remain skipped.
- The full Playwright run passed 67 tests with one optional private-sample skip. A final focused run passed all four tool UI specs without retries, including the visible, semantically indeterminate progress bar. Synthetic image files exist only in browser/test memory.
- The existing manual-worker base-path test now starts from the static how-to-use page to isolate its worker from the tool page's new editor worker. It still asserts one wasm binary request, the exact base-path URL, local detection and same-origin requests.
- Task 7.2 was not performed: the private sample was never copied or committed. Automated dark, narrow-layout and reduced-motion coverage passed instead.
- Task 7.3 is complete: PR #11 CI run 38150720016 passed the pre-wired browser step on commit 887e247, with 67 tests passing.
