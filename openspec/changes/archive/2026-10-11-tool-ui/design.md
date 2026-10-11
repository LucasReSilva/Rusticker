## Context

See `proposal.md` for motivation and `specs/sticker-editor/spec.md` for the behavior. When this change starts (Wave C) `develop` already contains:

- `web-scaffold`: the SvelteKit app, Paraglide catalogs (`pt-BR` base, `en`, `es`), a tool route at `/` (`/en`, `/es`) that renders only in the browser and is a placeholder, Vitest, and `bun run check | lint | test | build | i18n:check`.
- `design-tokens`: the theme (including the checkerboard utility, e.g. `bg-checkerboard`), and `ui/` components Button, Card, Slider, Tooltip, Badge, Dialog, DropdownMenu, Sonner, Progress, Skeleton, Separator; the `<Toaster>` is mounted by the layout.
- `wasm-worker`: `web/src/lib/detection/` with the shared-contract types (`Detector`, `Sticker { id, index, bbox, pixels: ImageData 512x512 }`, `DetectOptions`, `DetectionError`), `createDetector()` (latest-wins: superseded calls reject with an `AbortError`, recognized by `isCancelled(error)`), `createMockDetector(config?: { count?, failWith?, delayMs? })`, and `detectionErrorMessage(code)` returning the localized `error_*` text. Sticker ids are unique per detection run (`d<run>-s<index>`), so ids never survive a re-detection.

Constraints: only design-system components and tokens, logical utilities, no hardcoded text (DESIGN.md); everything stays on the device (AGENTS.md); `whatsapp-export` is built at the same time and must be able to plug in without editing tool-ui files other than the marked mount point in the page.

## Goals / Non-Goals

**Goals:**
- One state object that is the single source of truth for the editor and is unit-testable with the mock detector and fake timers.
- Feature components that are "dumb": props in, callbacks out, so each is tested in isolation.
- Stable, documented seams for `whatsapp-export`: `format.ts`, the `<Export>` props, and the size hook.

**Non-Goals:**
- No new `ui/` primitive (see D9). No changes to detection, the worker, or `error_*` keys.
- No persistence of the editor across reloads (the image is never stored anywhere).
- No undo for removals; no per-sticker manual crop.

## Decisions

### D1. Editor state: a runes class, used through a lazy module-scope singleton

`web/src/lib/state.svelte.ts` exports `class EditorState`, a factory `createEditorState(deps: { detector: Detector; decode?: (blob: Blob) => Promise<DecodedImage>; debounceMs?: number })`, and `getEditor(): EditorState`, which creates the app's single instance on first call (with `createDetector()` and the real `decodeImage`) and returns the same instance afterwards.

```ts
type Rgb = { r: number; g: number; b: number };
type EditorStatus = 'idle' | 'decoding' | 'detecting' | 'ready' | 'error';
type EditorErrorCode = DetectionErrorCode | 'UnsupportedFile' | 'DecodeFailed' | 'Unknown';
interface SourceImage { name: string; url: string /* object URL for <img> */; imageData: ImageData; width: number; height: number }

class EditorState {
  source = $state<SourceImage | null>(null);
  detected = $state.raw<Sticker[]>([]);          // last successful result, detection order
  removedIds = new SvelteSet<string>();
  tolerance = $state(50);                          // 0..100
  background = $state<Rgb>({ r: 0, g: 177, b: 64 }); // chroma green 0x00B140
  trayIconId = $state<string | null>(null);
  status = $state<EditorStatus>('idle');
  lastError = $state<EditorErrorCode | null>(null);

  readonly stickers = $derived(this.detected.filter((s) => !this.removedIds.has(s.id))); // kept, ordered
  readonly isProcessing = $derived(this.status === 'decoding' || this.status === 'detecting'); // also a pending debounce counts (see below)

  loadFile(blob: Blob): Promise<void>;     // validate type, decode, reset, detect now
  setTolerance(value: number): void;        // clamp+round, schedule detect after debounce
  setBackground(color: Rgb): void;          // cancel pending debounce, detect now
  removeSticker(id: string): void;          // + tray-icon fallback to first kept
  setTrayIcon(id: string): void;            // ignored if id is not kept
  dispose(): void;                          // clear timer, revoke object URL, detector.dispose() (tests only)
}
```

- **Why a singleton (contract addendum R7):** a language switch never reloads; the root layout re-renders the page under a locale `{#key}`, which destroys and remounts `+page.svelte`. State owned by the page component would be lost, so the instance lives at module scope and `+page.svelte` just calls `getEditor()`. The page never disposes it: the worker and the image stay alive for the browser session (also across visits to the how-to-use/about pages), which is the desired behavior and costs one idle worker. Creation is lazy so importing the module during prerender/SSR of other routes never touches `Worker` or `URL.createObjectURL`.
- In-flight work survives remounts too: the debounce timer, the detection promise and the sequence counter belong to the instance, not the component, so a result that arrives after the remount is applied normally.
- Tests never use `getEditor()`; they build isolated instances with `createEditorState({ detector: createMockDetector(), decode: fake })`. For the page test, `state.svelte.ts` also exports `setEditorForTesting(editor | null)` that replaces/clears the singleton (documented as test-only).
- Components do not import the store; the page passes slices as props (D2).
- `isProcessing` is the public "detection in progress" flag for `whatsapp-export` (R6). It is also true while a tolerance change is waiting for its debounce (a `$state` flag `pendingDebounce`), so export cannot start on a result that is about to be replaced.
- `$state.raw` for `detected` because `Sticker.pixels` holds large `ImageData` that must not be deep-proxied.
- On each successful result: `detected = result`, `removedIds.clear()`, `trayIconId = result[0]?.id ?? null` (spec: re-detection replaces the set; ids would not match anyway).
- On failure: `detected = []`, `status = 'error'`, `lastError = code`, then a toast (D7). `isCancelled(error)` rejections are ignored silently (a newer request is already running).
- Stale protection in addition to the detector's latest-wins: each `runDetection()` takes a sequence number and drops results whose number is not the latest (also covers a result arriving after a new image was loaded).
- Sticker sizes are **not** part of the editor state: they are measured and stored by `whatsapp-export` and read by the Grid through the optional `sizeOf` prop (D9a), so tool-ui never imports anything from `whatsapp-export`.

### D2. Component boundaries (props in, callbacks out)

| Component | Props | Events (callbacks) |
|---|---|---|
| `DropZone` | `compact?: boolean` (smaller "replace image" variant once an image is loaded), `disabled?: boolean` | `onFile(file: File)`, `onReject()` |
| `Preview` | `src`, `width`, `height`, `imageData`, `boxes: BBox[]`, `background: Rgb`, `busy` | `onPick(color: Rgb)` |
| `Controls` | `tolerance`, `background: Rgb`, `busy`, `hasImage` | `onToleranceChange(v)` |
| `Grid` | `stickers: Sticker[]`, `trayIconId`, `sizeOf?: (id: string) => StickerSizeInfo \| undefined`, `busy`, `pending: boolean` (show skeletons) | `onRemove(id)`, `onSetTrayIcon(id)` |
| `StickerCard` | `sticker`, `position: number` (1-based), `isTrayIcon`, `sizeOf?: (id: string) => StickerSizeInfo \| undefined`, `active: boolean` (roving tab stop) | `onRemoveRequest()`, `onSetTrayIcon()`, `onFocus()` |

`DropZone` validates the type itself (`file.type.startsWith('image/')`) and calls `onReject` so the page shows the toast; `EditorState.loadFile` re-validates (defense in depth, also covers paste). The page owns the `window` paste listener (D4) so pasting works even when the DropZone is hidden behind the compact variant.

### D3. Image decoding: `createImageBitmap` + `OffscreenCanvas`, isolated in `lib/tool/decode.ts`

`decodeImage(blob) -> { imageData, width, height }`: `createImageBitmap(blob, { imageOrientation: 'from-image' })`, draw into `new OffscreenCanvas(w, h)` with a `2d` context (`willReadFrequently: true`), `getImageData`, `bitmap.close()`. Failure -> `DecodeFailed`. The preview shows the file through an object URL (`URL.createObjectURL`, revoked on replace/dispose) in an `<img>`, so the browser handles scaling; no second canvas is needed. Kept in its own module so unit tests inject a fake (`createEditorState({ decode })`) since the test DOM has no `createImageBitmap`. Oversized images are not pre-checked here: the core is the single source of truth for limits and returns `ImageTooLarge`.

Alternative: `<img>` + `HTMLCanvasElement`. Rejected: slower, needs DOM, and the brief/ARCHITECTURE prescribe `createImageBitmap` + `OffscreenCanvas`.

### D4. DropZone and paste

- The Card wraps a visually hidden `<input type="file" accept="image/*">`; the Card itself is a `role="button"`, `tabindex="0"` element labelled by `tool_dropzone_title` (Enter/Space open the chooser). States via `data-state="idle|hover|dragging"` and token classes (`border-dashed`, `border-primary`, `bg-accent`), transitions with `motion-safe:`.
- `dragenter`/`dragleave` use a depth counter so child elements don't flicker the state; `dragover` calls `preventDefault` to allow drop.
- Paste: `+page.svelte` registers `paste` on `window` (removed on destroy), takes the first `clipboardData.items` entry with `kind === 'file'` and an image type; ignored if the target is an editable element. Ctrl vs Cmd needs no special handling (the browser fires `paste`).
- Multiple files: first file whose type is an image (spec).

### D5. Preview overlay and eyedropper

- Layout: a `relative` wrapper containing the `<img>` (`w-full h-auto`, `alt` = `tool_preview_alt`) and an absolutely positioned `<svg viewBox="0 0 {width} {height}" class="absolute inset-0 size-full">`. Boxes are `<rect>`s in source-pixel coordinates with `vector-effect="non-scaling-stroke"` and token classes (`stroke-primary`, `fill-none`), so they scale with the image without any px math. The crosshair is also drawn in the SVG.
- Eyedropper toggle: a `Button` (`variant="outline"`, `size="icon"`, lucide `Pipette`, `aria-pressed`, `aria-label` = `tool_eyedropper_label`) wrapped in a `Tooltip` (`tool_eyedropper_tooltip`). When active, the overlay gets `tabindex="0"`, `role="application"` with `aria-label` = `tool_eyedropper_area_label` (instructions in `aria-describedby` = `tool_eyedropper_keyboard_hint`), `cursor-crosshair`, and receives focus.
- Pointer: map `offsetX/Y` to source pixels via `getBoundingClientRect()` ratio.
- Keyboard: crosshair starts at the image center; arrows move by `step = max(1, round(min(w, h) / 100))` source pixels, Shift multiplies by 10; clamped to the image (`lib/tool/eyedropper.ts: moveCrosshair(pos, key, shift, size)`); Enter/Space pick; Escape cancels and returns focus to the toggle.
- Sampling: `sampleColor(imageData, x, y, radius = 1)` averages the 3x3 neighborhood (clipped at edges) and rounds each channel. Picking calls `onPick`; the page calls `editor.setBackground` (immediate re-detection) and announces `tool_eyedropper_picked({ color: hex })` in a polite live region. The hex code is data, not translated text.

Alternative: the native `EyeDropper` API. Rejected: Chromium-only, samples the screen (scaled/color-managed) instead of the source pixels, and has no keyboard path.

### D6. Controls and debounce

- `Slider` (min 0, max 100, step 1) bound to `editor.tolerance` through `onToleranceChange`; label `tool_tolerance_label` with the value shown via `formatPercent(tolerance / 100)` and the same string as `aria-valuetext`. Help text `tool_tolerance_help`.
- Debounce 300 ms in `EditorState.setTolerance` (one timer; reset on every change; cleared by `setBackground`, `loadFile`, `dispose`). The value displayed updates immediately; only detection is deferred. Combined with the detector's latest-wins and D1's sequence check, earlier results are never displayed.
- Background swatch: a token-bordered square whose fill is the picked color, set through a CSS custom property (`style="--swatch: rgb(r g b)"`, class `bg-(--swatch)`) plus the hex code in `font-mono`. This is the one inline color in the UI, justified because it is user data, not styling.
- Busy feedback: `Progress` in indeterminate mode (no value) with `aria-label` = `tool_processing_label` while `editor.isProcessing`; regions that will change get `aria-busy`. When there is no previous result, the Grid shows `Skeleton` cards (count: 6). Completion is announced through a polite live region with `tool_detected_count`.

### D7. Errors and toasts

All failures go through one page-level handler watching `editor.lastError` changes (an `$effect` keyed by an error sequence number, so the same code twice still toasts twice):
- Detection codes -> `toast.error(detectionErrorMessage(code))` (owned by `wasm-worker`; unknown codes fall back to its generic text or `tool_error_unknown`).
- `UnsupportedFile` -> `tool_error_unsupported_file`; `DecodeFailed` -> `tool_error_decode_failed`; `Unknown` -> `tool_error_unknown`.
- `UnsupportedFile` and `DecodeFailed` keep the previous image and result (spec); detection errors clear the grid but keep the preview.

### D8. Grid keyboard model: roving tabindex over a list

- Markup: a heading (`tool_grid_heading`, `tabindex="-1"` so focus can land there after the last removal), then `<ul role="list">` with CSS grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (gap tokens), each `<li>` holding a `StickerCard`. The card's root `Card` is focusable (`tabindex = active ? 0 : -1`), `aria-label` = `tool_sticker_label({ position, total })`; its action buttons get `tabindex = active ? 0 : -1` so Tab goes card -> its actions -> out of the grid.
- `role="grid"` was rejected: the cards are not tabular cells and the ARIA grid pattern would require row elements that the responsive layout cannot provide.
- Pure navigation in `lib/tool/grid-nav.ts: nextIndex(current, key, count, columns)` (Left/Right ±1 with clamping, swapped when `dir="rtl"` for future RTL; Up/Down ±columns; Home/End). `columns` is computed at key time by counting cards whose `offsetTop` equals the first card's, so it follows the real responsive layout.
- Delete/Backspace on a focused card opens that card's remove Dialog.
- After removal the Grid focuses the card now at the same index (the next one), else the previous one, else the heading (`tick()` then `focus()`).

### D9. StickerCard rendering

- The 512x512 `ImageData` is drawn once into a `<canvas width="512" height="512">` (`putImageData` in an `$effect` keyed by sticker id), styled `w-full h-auto aspect-square bg-checkerboard`, with `role="img"` and `aria-label` = `tool_sticker_alt({ position })`. Canvas avoids encoding a blob per sticker just to display it (encoding belongs to `whatsapp-export`).
- Size badge: see D9a.
- Tray icon: `Button variant="ghost"` with lucide `Star`, `aria-pressed={isTrayIcon}`, `aria-label` = `tool_tray_icon_set`; when chosen, a `Badge` `tool_tray_icon_badge`.
- Remove: `Button variant="ghost" size="icon"` with lucide `Trash2`, `aria-label` = `tool_remove_label({ position })` inside a `Tooltip`; opens `Dialog` with `tool_remove_title({ position })`, `tool_remove_description`, actions `tool_remove_confirm` (`variant="destructive"`) / `tool_remove_cancel`. The Dialog returns focus to its trigger on cancel (Bits UI default).
- No new `ui/` component is needed; everything composes Card, Badge, Button, Tooltip, Dialog, Slider, Progress, Skeleton, Separator.

### D9a. Size badge API (`web/src/lib/tool/size.ts`, contract addendum R6)

```ts
export type StickerSizeInfo =
  | { status: 'pending' }
  | { status: 'ready'; bytes: number; overLimit: boolean }
  | { status: 'error' };
```

- `Grid` forwards its optional `sizeOf` to each `StickerCard`; the card calls `sizeOf?.(sticker.id)` inside a `$derived`, so a reactive store on the `whatsapp-export` side (e.g. a `SvelteMap`'s bound `get`) updates badges automatically.
- Rendering: `undefined` (or no `sizeOf`) -> no badge; `pending` -> `Badge variant="secondary"` with `tool_size_pending` and `aria-label` = `tool_size_pending_label`; `ready` -> `formatKilobytes(bytes)` with `aria-label` = `tool_size_label({ size })`, and when `overLimit` the `destructive` variant plus `aria-label` = `tool_size_over_limit_label({ size })` and a Tooltip with the same text; `error` -> `variant="outline"` with `tool_size_unavailable`.
- Until `whatsapp-export` wires `sizeOf` in its last task, the page passes nothing and no badges appear (spec: "No size information").

### D10. Page composition and the `<Export>` seam

`+page.ts`: keeps `export const ssr = false` (and `prerender = false`) as set by `web-scaffold`. `+page.svelte` (mobile-first, one column; `lg:` two columns: preview + controls in a `lg:sticky` start column, grid + export in the end column; all spacing via `gap-*`, `p-*`, `ms-*`/`me-*`):

```svelte
<DropZone compact={!!editor.source} ... />
{#if editor.source}
  <Preview ... /> <Controls ... />
  <p aria-live="polite">{m.tool_detected_count({ count: editor.stickers.length })}</p>
  <Grid ... />  <!-- no sizeOf yet; whatsapp-export adds sizeOf={stickerSizes.get} -->
  <section data-slot="export" aria-label={m.tool_export_region_label()}>
    <!-- @whatsapp-export:mount -->
  </section>
{/if}
```

- `const editor = getEditor()` at the top of the page script (D1); the paste listener is added on mount and removed on destroy, so a locale remount re-registers it once.
- The section exists so the layout, spacing and focus order are final now. Per contract addendum R6, `whatsapp-export`'s last task replaces only the `<!-- @whatsapp-export:mount -->` line with `<Export stickers={editor.stickers} trayIconId={editor.trayIconId} detecting={editor.isProcessing} />` and adds `sizeOf={stickerSizes.get}` to `<Grid>`. Prop types: `stickers: Sticker[]` (kept, detection order), `trayIconId: string | null` (null only when no sticker is kept), `detecting: boolean`.

### D11. `format.ts` (shared API)

```ts
export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string;
export function formatKilobytes(bytes: number, locale?: string): string; // bytes / 1000, unit 'kilobyte', short display, max 1 fraction digit (0 when >= 100)
export function formatPercent(ratio: number, locale?: string): string;   // ratio 0..1, style 'percent', max 0 fraction digits
```

- `locale` defaults to Paraglide's `getLocale()`; formatters are cached per `(locale, options)` key.
- 1 KB = 1000 bytes, matching `whatsapp-export`'s budget definition (100 KB = 100,000 bytes) and Intl's `kilobyte` unit; showing "100 kB" for a file that is exactly at the budget avoids confusing users.

### D12. Messages (`tool_*`, all three locales, real translations)

`tool_dropzone_title`, `tool_dropzone_hint` (drag, click or paste), `tool_dropzone_replace`, `tool_dropzone_dragging`, `tool_preview_alt`, `tool_preview_heading`, `tool_eyedropper_label`, `tool_eyedropper_tooltip`, `tool_eyedropper_area_label`, `tool_eyedropper_keyboard_hint`, `tool_eyedropper_picked` ({color}), `tool_background_label`, `tool_tolerance_label`, `tool_tolerance_help`, `tool_processing_label`, `tool_detected_count` ({count}, plural), `tool_grid_heading`, `tool_grid_empty`, `tool_sticker_label` ({position}, {total}), `tool_sticker_alt` ({position}), `tool_size_pending`, `tool_size_pending_label`, `tool_size_label` ({size}), `tool_size_over_limit_label` ({size}), `tool_size_unavailable`, `tool_tray_icon_set`, `tool_tray_icon_badge`, `tool_remove_label` ({position}), `tool_remove_title` ({position}), `tool_remove_description`, `tool_remove_confirm`, `tool_remove_cancel`, `tool_error_unsupported_file`, `tool_error_decode_failed`, `tool_error_unknown`, `tool_export_region_label`. Plurals use Paraglide's variant syntax with a `plural` selector on `count` (forms `one`/`other` for all three locales). Exact copy is written in the catalogs; `bun run i18n:check` must pass.

### D13. Tests (vitest, no wasm)

- **Unit (node):** `format.ts` (pt-BR/en/es separators, KB rounding, percent); `grid-nav.ts` (edges, rows, Home/End, RTL); `eyedropper.ts` (clamping, step sizes, 3x3 averaging at corners); `EditorState` with `createMockDetector()`, a fake `decode` and fake timers: load -> stickers + tray = first; non-image -> `UnsupportedFile`, previous image kept; tolerance burst -> one detect call with the last value; `setBackground` cancels pending debounce; `failWith: 'NoStickers'` -> empty, `status = 'error'`; cancelled rejection ignored; remove tray sticker -> fallback; re-detection clears removals; `isProcessing` true during decode, detection and a pending debounce; `getEditor()` returns the same instance on repeated calls and `setEditorForTesting` replaces it; `dispose` revokes URL and disposes detector.
- **Component (DOM environment):** DropZone (keyboard opens chooser, drag states, reject callback); Preview (box count/positions in the SVG, keyboard eyedropper: arrows + Enter emit `onPick` with the sampled color, Escape emits nothing and refocuses toggle); Controls (arrow key changes value, percent text per locale); Grid/StickerCard (arrows/Home/End/Up/Down move focus, single tab stop, Delete opens dialog, confirm removes and focuses next, cancel restores focus, tray badge + `aria-pressed`; badge per `StickerSizeInfo` state: none for `undefined`, placeholder for `pending`, formatted KB for `ready`, destructive variant + label for `overLimit`, unavailable for `error`); page smoke test with a mock-backed editor injected through `setEditorForTesting` (load -> N cards, count text, error toast text for `NoStickers` in each locale; unmounting and remounting the page, as a locale switch does, keeps the image, kept stickers, removals and tray choice; the `@whatsapp-export:mount` marker sits inside `section[data-slot=export]`).
- **E2E (Playwright, default project: built app with the real wasm):** `web/e2e/tool-ui/` covers what the unit tests cannot: drop, click and paste upload of a synthetic image, boxes drawn, the keyboard eyedropper, tolerance re-detection, remove with confirm, tray selection, grid keyboard navigation, state kept across a language switch, no cross-origin requests, and no overflow at 375px in dark theme. Images are drawn in the test; the sample image is covered by `wasm-worker` only.

## Risks / Trade-offs

- [Sticker ids change on every detection, so removals and tray choice reset when tolerance/color changes] → stated in the spec; users usually tune first, then curate. A later change could match stickers across runs by bbox overlap.
- [Copying ~17 MB per detection (worker contract) on every slider pause] → acceptable with 300 ms debounce and latest-wins; noted by `wasm-worker` as a later optimization.
- [Column count read from layout at key time] → cheap (one pass over `offsetTop`), always matches the visible layout; falls back to 1 column if layout is unavailable (tests).
- [`role="application"` on the eyedropper area changes screen-reader key handling] → only while the mode is active, with explicit instructions in `aria-describedby`; Escape always exits.
- [Large images in `<img>` + `ImageData` both in memory] → the same data the detector needs anyway; object URL revoked on replace.
- [Singleton keeps a worker and the image in memory for the whole session] → intended (R7: state survives locale switches); replacing the image revokes the previous object URL, and the worker is idle when not detecting.
- [Singleton leaking between tests] → tests never call `getEditor()` except through `setEditorForTesting`, which they reset in `afterEach`.
- [Inline swatch color] → the only non-token color, derived from user data; documented in DESIGN.md.
- Privacy: no network APIs are used; files are read with `createImageBitmap` and object URLs, both local.

## Migration Plan

Additive; replaces the placeholder tool page. Rollback = revert the merge commit (the page returns to the placeholder; `whatsapp-export`'s mount task would then have to wait).

## Open Questions

- **`detectionErrorMessage` fallback:** if `wasm-worker` returns no text for an unknown code, the page uses `tool_error_unknown`.

Resolved in the cross-change reconciliation (contract addendum): the `web/src/lib/tool/` folder is accepted (R6 places `size.ts` there); the `client` Vitest project (jsdom + Svelte testing helper) is provided by `web-scaffold` and is not edited here (R4); the `<Export>` props and the `sizeOf`/`StickerSizeInfo` size API are fixed by R6; the editor singleton follows R7.
