## Context

See proposal.md for motivation and specs/sticker-export/spec.md for the required behavior.

When this change starts (Wave C), `develop` contains:
- `web-scaffold`: SvelteKit app, Paraglide (pt-BR base, en, es), vitest, `bun run check | lint | test | build | i18n:check`.
- `design-tokens`: `web/src/lib/components/ui/**` (Button, Progress, Badge, Sonner, Tooltip, ...).
- `wasm-worker`: `web/src/lib/detection/types.ts` (`Sticker { id, index, bbox, pixels: ImageData /* 512x512 */ }`) and `createMockDetector()` in `web/src/lib/detection/mock.ts`.

`tool-ui` is implemented in parallel and owns `state.svelte.ts`, `Grid.svelte`, `StickerCard.svelte`, `format.ts`, `web/src/lib/tool/size.ts`, and the tool page. This change must therefore not import from those files until its last integration task; the seams are fixed by the shared contract addendum R6 (Decisions 6 and 9).

Constraints: client-side only (no network with user data), Bun only, every user-visible string in `messages/*.json`, design-system components only (DESIGN.md), locale-neutral file names.

## Goals / Non-Goals

**Goals:**
- A pure TS library (`web/src/lib/export/`) whose logic (quality search, splitting, naming, tray-icon choice, zip layout, orchestration) is unit-testable in vitest with injected fakes, without a canvas, a worker, or wasm.
- A thin browser adapter (OffscreenCanvas) that is the only code touching canvas APIs.
- A thin `Export.svelte` that only renders state from a controller and maps codes to messages.
- Each sticker encoded once: the background size computation feeds the badge and is reused by the export.

**Non-Goals:**
- Encoding in a dedicated worker (see Decision 3).
- A WEBP encoder fallback for browsers that cannot encode WEBP in canvas.
- WhatsApp metadata files, animated stickers, native "Add to WhatsApp".
- Component (DOM) tests for `Export.svelte`; its logic lives in the tested controller.

## Decisions

### 1. Module layout in `web/src/lib/export/`

| File | Responsibility | Touches browser APIs |
|------|----------------|----------------------|
| `constants.ts` | `MAX_STICKER_BYTES = 100_000`, `MIN_STICKERS_PER_PACK = 3`, `MAX_STICKERS_PER_PACK = 30`, `STICKER_SIZE = 512`, `TRAY_ICON_SIZE = 96`, `QUALITY_START = 0.9`, `QUALITY_FLOOR = 0.1`, `QUALITY_SEARCH_STEPS = 5` | no |
| `types.ts` | `Encoder`, `EncodedSticker`, `Pack`, `PackArchive`, `ExportErrorCode`, `ExportError`, `ExportProgress`, `ExportResult` | no |
| `split.ts` | `splitIntoPacks<T>(items: T[]): T[][]` | no |
| `names.ts` | `packFileName(n)`, `stickerWebpName(i)`, `stickerPngName(i)`, `TRAY_ICON_NAME` | no |
| `quality.ts` | `encodeWithinBudget(pixels, encoder, opts?)` | no (encoder injected) |
| `tray.ts` | `pickTrayIconSticker(stickers, trayIconId)` | no |
| `zip.ts` | `buildPackZip(entries): Promise<Blob>` | no (JSZip only) |
| `sizes.svelte.ts` | reactive per-sticker encode cache and size lookup (Decision 6) | no (encoder injected) |
| `export.ts` | `exportPacks(stickers, trayIconId, deps)` orchestrator | no (encoder injected) |
| `canvas.ts` | `createCanvasEncoder(): Encoder` (WEBP, PNG, 96x96 tray resample) via OffscreenCanvas | **yes** |
| `download.ts` | `downloadBlob(blob, fileName)` (blob URL + anchor click + revoke) | **yes** |
| `controller.svelte.ts` | `createExportController(...)`: runes state for `Export.svelte` (phase, progress, packs, last result) | no |
| `index.ts` | public re-exports | - |

The encoder seam:

```ts
export interface Encoder {
  webp(pixels: ImageData, quality: number): Promise<Blob>; // must reject or return non-webp type if unsupported
  png(pixels: ImageData): Promise<Blob>;                    // lossless 512x512 copy
  trayIcon(pixels: ImageData): Promise<Blob>;               // 96x96 PNG, transparent
}
```

Tests pass a fake encoder whose WEBP size is a deterministic function of quality (e.g. `bytes = round(base * quality)`), so the quality search is tested without a canvas. Alternative considered: test with a real canvas via `happy-dom` / `node-canvas` — rejected, neither encodes lossy WEBP reliably, and it couples tests to a native dependency.

### 2. Quality search (size budget)

Budget is 100,000 bytes (decimal KB), the conservative reading of WhatsApp's "100 KB" (not 102,400). Quality is the canvas `quality` argument in [0, 1].

```
encode(q=0.9)            -> fits?  return it                          (1 encode, common case)
encode(q=0.1 floor)      -> too big? return floor blob, overLimit    (2 encodes)
lo = 0.1 (fits), hi = 0.9 (too big), best = floor blob
repeat 5 times:
  mid = (lo+hi)/2; b = encode(mid)
  if b.size <= budget: best = b (keep highest-quality fitting), lo = mid
  else: hi = mid
return best
```

- At most 7 encodes per sticker; final resolution 0.8 / 32 = 0.025.
- Size is not strictly monotonic in quality for lossy WEBP; the search only ever returns a blob that was measured to fit (or the floor blob flagged `overLimit`), so non-monotonicity can only cost quality, never correctness.
- Result type: `{ blob, quality, bytes, overLimit }`.
- Unsupported WEBP: some browsers silently fall back to PNG when asked for an unsupported type. If the returned `blob.type !== 'image/webp'` the search throws `ExportError('WebpUnsupported')`. Any other encoder rejection becomes `ExportError('EncodeFailed')`.
- Alternatives: linear steps of 0.1 (up to 9 encodes, coarser); predicting quality from first size (fragile). Binary search with a fitting-first shortcut is cheapest for the common case (most 512x512 stickers with large transparent areas fit at 0.9).
- Over budget at floor: keep the sticker (flagged) instead of dropping it, because dropping silently changes the pack and pack sizes; the user is warned (`export_over_budget_warning`, plural on count) and the size badge shows the over-budget state. Practically rare for 512x512 at quality 0.1.

### 3. Encoding runs on the main thread, sequentially, via OffscreenCanvas

`canvas.ts` creates one 512x512 `OffscreenCanvas` and one 96x96 one, `putImageData` + `convertToBlob`. Encoding is async (the browser encodes off the JS thread), so the main thread stays responsive; jobs run one at a time through a small queue so background size computation (Decision 6) cannot saturate the encoder while the user interacts. Alternative: a second worker for encoding — rejected for now (extra worker plumbing, `ImageData` transfer, and OffscreenCanvas support in workers is the same browser set); the `Encoder` seam allows moving it later without touching callers.

Tray icon: draw the 512x512 sticker onto a 96x96 OffscreenCanvas with `imageSmoothingEnabled = true` and `imageSmoothingQuality = 'high'` (put the ImageData on the 512 canvas, then `drawImage` it scaled), then `convertToBlob({ type: 'image/png' })`. A 96x96 RGBA PNG is at most ~37 KB uncompressed, under WhatsApp's 50 KB tray limit by construction.

### 4. Pack splitting algorithm

```
n < 3            -> [] and the controller reports `TooFewStickers` (export blocked)
3 <= n <= 30     -> [items]
n > 30           -> k = ceil(n / 30); base = floor(n / k); extra = n % k
                    pack i (0-based) gets base + (i < extra ? 1 : 0), contiguous slices in order
```

Examples: 31 -> 16+15, 45 -> 23+22, 60 -> 30+30, 61 -> 21+20+20, 90 -> 30+30+30, 91 -> 23+23+23+22. For n > 30, each pack has at least floor(n/k) >= 15 stickers, so the 3-sticker minimum always holds; with k = ceil(n/30) no pack exceeds 30. Alternative "fill 30, then remainder" (31 -> 30+1) breaks the 3-minimum and was rejected. `splitIntoPacks` is generic over the item type so tests use plain numbers.

### 5. Archive layout, names, and download strategy

Per pack (numbering restarts at 01 in each pack; two digits suffice since a pack holds at most 30):

```
rusticker-pack-1.zip
+-- sticker_01.webp ... sticker_NN.webp     (WhatsApp files, <= 100,000 bytes each)
+-- tray_icon.png                           (96x96)
+-- png/sticker_01.png ... png/sticker_NN.png  (lossless 512x512 copies)
```

- **What the PNGs are** (brief: "os WEBP, os PNG e o ícone da bandeja"): lossless 512x512 PNG copies of the same stickers, useful for editing or for importer apps that re-encode. They live in `png/` so the archive root holds exactly what a WhatsApp importer needs. PNG copies are not size-limited.
- Zip uses STORE (no compression): WEBP and PNG are already compressed, so DEFLATE only costs time. Entry dates fixed to a constant so identical input yields identical archives (deterministic tests).
- **One zip per pack, not an outer zip.** Rationale: the brief names `rusticker-pack-1.zip`; a pack zip is the unit importer apps and users handle; a zip-of-zips is awkward on phones (two extraction steps). The common case (<= 30 stickers) is one file either way.
- **Multiple downloads:** the primary button downloads all pack zips in order with a short gap (~400 ms) between them; browsers may ask once for permission to download multiple files. Because that can be blocked, after a split export the component also shows one "Download pack n of total" button per pack, each a separate user gesture, re-using the already built blobs (kept in memory until the sticker set changes).
- `download.ts`: `URL.createObjectURL(blob)` -> hidden `<a download>` click -> `revokeObjectURL` after a delay. Blob URLs are local; nothing leaves the device.

### 6. Size reporting API (consumed by `tool-ui`'s sticker card; shared contract addendum R6)

The size type is owned by `tool-ui` in `web/src/lib/tool/size.ts`:

```ts
export type StickerSizeInfo =
  | { status: 'pending' }
  | { status: 'ready'; bytes: number; overLimit: boolean }
  | { status: 'error' };
```

Because `tool-ui` is implemented in parallel, this change declares a **structurally identical local copy** in `web/src/lib/export/types.ts` (same name, same shape) plus a type-compat test (`size-compat.test.ts`, `expectTypeOf` / assignability checks in both directions against a literal copy of the R6 shape). The final wiring task (6.1) deletes the local copy, re-exports `StickerSizeInfo` from `$lib/tool/size`, and points the compat test at tool-ui's type.

`web/src/lib/export/sizes.svelte.ts`:

```ts
export interface StickerSizes {
  sync(stickers: Sticker[]): void;          // start background encodes for new stickers, drop removed ones
  get(id: string): StickerSizeInfo;         // reactive (SvelteMap); unknown id -> { status: 'pending' }; arrow fn, safe to pass unbound
  encoded(sticker: Sticker): Promise<EncodedSticker>; // awaits/reuses the cached encode (used by exportPacks)
}
export function createStickerSizes(encoder: Encoder): StickerSizes;
export const stickerSizes: StickerSizes;    // app singleton using createCanvasEncoder(), browser only
```

- `overLimit` is the quality search's over-budget flag (Decision 2). `{ status: 'error' }` carries no code (R6); the error code is kept internally and surfaced by `encoded()` / the export, not through `get`.
- Cache key is the sticker `id` **plus the identity of its `pixels` object**: if a re-detection reuses an id with new pixels, the entry is invalidated (spec: new detection invalidates sizes). Removed stickers are dropped on `sync`.
- Bytes are raw numbers; formatting to "NN KB" (decimal KB, consistent with the 100,000-byte budget) is done by `tool-ui`'s `StickerCard` with its own Intl helper in `web/src/lib/format.ts`. This change never formats sizes for the badge.
- Seam into the grid (R6): `Grid`/`StickerCard` accept optional `sizeOf?: (id: string) => StickerSizeInfo | undefined` (undefined -> no badge). This change does not edit `Grid.svelte` / `StickerCard.svelte`; the final task passes `sizeOf={stickerSizes.get}` to `<Grid>` in the tool page. No `onSizeMeasured` callback and no `editor.setStickerSize`: sizes flow one way, export -> grid.

### 7. Orchestration and controller

`exportPacks(stickers, trayIconId, { sizes, encoder, onProgress })`:
1. `splitIntoPacks(stickers)`; empty -> throw `ExportError('TooFewStickers')`.
2. For each sticker: `await sizes.encoded(sticker)` (WEBP, reused from the background cache) and `encoder.png(pixels)`; progress step per sticker.
3. Tray icon once: `pickTrayIconSticker(stickers, trayIconId)` (chosen id if present in `stickers`, else `stickers[0]`) -> `encoder.trayIcon`.
4. For each pack: `buildPackZip` with names from `names.ts`; progress step per pack.
5. Return `{ archives: { fileName, blob, stickerCount }[], stickerCount, packCount, overBudgetCount }`.

Progress = `{ done, total }` with `total = stickers.length + packs.length` (PNG/tray steps folded into the sticker steps), rendered with the design-system Progress.

`createExportController({ getStickers, getTrayIconId, isDetecting, sizes, encoder, download })` exposes runes state: `phase: 'idle' | 'exporting' | 'done' | 'error'`, `progress`, `plan` (`{ stickerCount, packSizes }` derived from `splitIntoPacks`), `canExport`, `blockedReason: 'TooFewStickers' | 'Detecting' | 'Exporting' | null`, `archives`, and actions `exportAll()` / `downloadPack(i)`. Archives are cleared when the sticker list changes. Everything is injectable, so the controller is tested with `createMockDetector()` stickers and a fake encoder/downloader.

### 8. `Export.svelte` and messages

Props (keeps the component independent of `state.svelte.ts`; the tool page wires them):

```ts
{ stickers: Sticker[]; trayIconId: string | null; detecting: boolean } // exactly these (R6)
```

UI, all from `ui/`: primary `Button` ("Download pack (.zip)", Lucide `Download` icon `aria-hidden`), `Progress` while exporting (with an `aria-live="polite"` text), a muted info line for the split notice and for the "at least 3 stickers" explanation, secondary `Button`s per pack after a split export, Sonner toasts for success / warning / errors. Logical utilities only; no new UI primitive is needed (an inline notice uses tokens `text-muted-foreground` + Lucide `Info`; if `design-tokens` ships an Alert component, use it instead).

Message keys (pt-BR base, en, es; plurals with the Paraglide variant syntax adopted in `web-scaffold`; en shown):

| Key | Params | en |
|-----|--------|----|
| `export_download_button` | - | Download pack (.zip) |
| `export_download_all_button` | `total` | Download all {total} packs (.zip) |
| `export_download_pack_button` | `n`, `total` | Download pack {n} of {total} |
| `export_min_stickers_notice` | `min` | WhatsApp needs at least {min} stickers per pack. |
| `export_split_notice` | `count`, `packs` | {count} stickers will be split into {packs} packs (up to 30 each). |
| `export_progress_label` | `done`, `total` | Preparing {done} of {total}... |
| `export_success_toast` | `count`, `packs` | plural: 1 pack -> "Pack ready: {count} stickers"; n packs -> "{packs} packs ready: {count} stickers" |
| `export_over_budget_warning` | `count` | plural: "1 sticker is over 100 KB..." / "{count} stickers are over 100 KB..." and may be rejected by WhatsApp |
| `export_error_webp_unsupported` | - | This browser can't create WEBP stickers. Try Chrome, Edge, or Firefox. |
| `export_error_failed` | - | Couldn't create the pack. Please try again. |

The single-pack button reads `export_download_button`; with several packs the primary button reads `export_download_all_button`. `ExportErrorCode` -> message mapping lives in `Export.svelte` (`TooFewStickers` is never a toast; it is the disabled-state notice).

### 9. Coordination with `tool-ui` (parallel wave)

Until the integration task, this change imports only from `$lib/detection` (types, mock) and `$lib/components/ui`. Per contract addendum R6, `tool-ui` exposes `editor.isProcessing` (boolean getter) and leaves the marked block `<!-- @whatsapp-export:mount -->` inside `<section data-slot="export">` in the tool page. The integration task (after `tool-ui` is merged, on a branch rebased on `develop`) edits the tool page only: it replaces that marker with `<Export stickers={editor.stickers} trayIconId={editor.trayIconId} detecting={editor.isProcessing} />`, calls `stickerSizes.sync(editor.stickers)` in an `$effect`, and passes `sizeOf={stickerSizes.get}` to `<Grid>`; it also switches `StickerSizeInfo` to the import from `$lib/tool/size` (Decision 6).

### 10. E2E tests (Playwright)

Vitest covers the pure library and the controller (above). `web/e2e/whatsapp-export/export.spec.ts` (default project, built app) covers what only a browser proves: the download events, the archives read back in the test with `jszip` (names, WEBP and PNG dimensions, byte budget), and the multi-pack case with 31 synthetic stickers. Images are synthetic and drawn in the test, so the spec runs in CI.

## Risks / Trade-offs

- [Safari / WebKit cannot encode WEBP via canvas (returns PNG)] -> detected by blob type, `WebpUnsupported` error with a localized message and no partial download; a wasm WEBP encoder fallback is a possible later change.
- [Browsers block the 2nd+ automatic download] -> per-pack buttons, each a fresh user gesture, are always shown after a split export.
- [Size not monotonic in quality] -> search only returns measured-fitting blobs; worst case is a slightly lower quality than optimal.
- [Background encoding competes with re-detection while dragging the tolerance slider] -> sequential queue; `sync` with a new set drops queued jobs for removed stickers; encodes are cheap (~1 per sticker in the common case).
- [Memory: blobs for 2 x 30 stickers kept for re-download] -> a few MB at most; released when the sticker set changes.
- [Encoded size differs between browsers] -> spec is about the budget, not exact bytes; tests use a fake encoder.
- [`tool-ui` type drifts from R6 before merge] -> local `StickerSizeInfo` copy is guarded by a type-compat test, and the final task switches to importing tool-ui's type so `bun run check` fails on any mismatch; any change needed in `Grid`/`StickerCard` is reported, not made here.

## Migration Plan

Additive; no data or route migration. Rollback = revert the merge; the tool page then loses the Export section and the size badge receives no sizes.
