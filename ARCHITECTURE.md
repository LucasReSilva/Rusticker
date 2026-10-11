# Architecture

> **Status: target architecture.** This document describes where Rusticker is
> heading, not code that exists today. Names (`detect`, `Sticker`, `ErrorCode`,
> component and file names) are **provisional**. As each OpenSpec change lands,
> the specs under [`openspec/specs/`](openspec/specs/) become authoritative; if
> this document and a spec disagree, the spec wins.

## 1. Goals and constraints

- **100% client-side.** The site is static (SvelteKit `adapter-static`). There
  is no application server and no API. User images never leave the browser.
- **Heavy work off the main thread.** Image processing is Rust compiled to
  WebAssembly, running inside a Web Worker.
- **No user-facing text in Rust.** The core returns codes/enums only; the
  frontend translates them through the Paraglide message catalogs
  (see [DESIGN.md](DESIGN.md)).
- **WhatsApp-ready output** with no manual post-processing (see section 8).

## 2. Monorepo layout (planned)

```text
Rusticker/
+-- core/                 Rust crate `rusticker-core`
|   +-- src/              detection pipeline, wasm-bindgen exports
|   +-- pkg/              wasm-pack output (git-ignored)
+-- web/                  SvelteKit app
|   +-- messages/         Paraglide catalogs (<locale>.json)
|   +-- src/lib/          worker, state store, components
|   +-- src/routes/       tool, how-to-use, about
|   +-- static/           PWA icons
+-- openspec/             specs (source of truth) and changes
```

- **`core/`** - crate `rusticker-core` (implemented by `core-detection`),
  the only member of the root Cargo workspace, built with
  `wasm-pack build core --target web` and `wasm-bindgen`.
  - `image`: pixel buffers and resizing (Lanczos3); no codecs in the library.
  - `imageproc`: connected components and morphology.
  - No OpenCV.
  - Modules: `color` (HSV thresholds), `mask` (foreground + opening),
    `components` (labelling, size filter), `alpha` (crop + alpha), `order`
    (reading order), `frame` (512x512 framing), `wasm` (bindings), `error`.
  - Tests: `core/tests/synthetic.rs` (images painted in code) and
    `core/tests/sample_image.rs` (local only, see section 10).
  - Output goes to `core/pkg/`, which is git-ignored.
- **`web/`** - SvelteKit 2, Svelte 5 (runes), TypeScript, Vite, managed with Bun.
  - Depends on the wasm package as `"rusticker-core": "file:../core/pkg"`.
    The dependency is copied, so re-run `bun install` after every
    `wasm-pack build` (the `build:wasm` script does both).
  - Vite serves the `.wasm` either through `vite-plugin-wasm` or through a
    `?url` import passed to `init(url)`.
- **`openspec/`** - behavior specs and in-flight changes.

## 3. Runtime data flow

```text
  File picker / Ctrl+V paste / drag-and-drop
                 |
                 v
  createImageBitmap + OffscreenCanvas  --->  ImageData (RGBA, width, height)
                                                     |
       main thread                                   | Comlink call,
  - - - - - - - - - - - - - - - - - - - - - - - - - -|- ArrayBuffer transferred
       Web Worker (src/lib/worker.ts)                v  as Transferable
                                     +-------------------------------------+
                                     | wasm (initialized once)             |
                                     | detect(rgba, width, height,         |
                                     |        background, tolerance)       |
                                     |   -> Result<Vec<Sticker>, ErrorCode>|
                                     +-------------------------------------+
                                                     |
       Web Worker                                    | per sticker: bbox +
  - - - - - - - - - - - - - - - - - - - - - - - - - -|- 512x512 RGBA (with alpha),
       main thread                                   v  buffers transferred back
                                     state store -> UI Grid (preview, remove,
                                                     choose tray icon)
                                                     |
                                                     v
                         OffscreenCanvas.convertToBlob({ type: 'image/webp', quality })
                                                     |
                                                     v
                                  JSZip (WEBP + PNG + tray icon) -> download .zip
```

- Lossy WEBP encoding is done by the **browser**, because the `image` crate
  only encodes lossless WEBP.
- On error, `detect` returns an `ErrorCode`; the UI shows a translated toast.
- **Allowed simplification:** `detect` may return only the bounding box plus a
  mask per sticker, and JavaScript performs the crop, alpha, and resize on a
  canvas. The worker/Comlink boundary stays the same either way.

## 4. Detection algorithm

The pipeline was validated in a Python/OpenCV prototype and is ported to Rust
with `image` + `imageproc`.

The exact rules live in the
[`sticker-detection` spec](openspec/specs/sticker-detection/spec.md)
(moved to `openspec/specs/sticker-detection/` when the change is archived).

1. **Background mask (HSV).** Convert to HSV; a pixel is background if it is
   close to the background color. For chroma-key green the working range is
   **hue 70°-170°, saturation >= 47%, value >= 24%**. The background color is
   configurable: the user picks it with an eyedropper on the preview and
   adjusts a tolerance slider (0-100, default 50). With tolerance `t` and the
   picked color's hue `h_bg`, saturation `s_bg`, and value `v_bg`, a pixel is
   background iff its circular hue distance to `h_bg` is at most `t` degrees,
   its saturation is at least `min(0.94 * (1 - t/100), s_bg)`, and its value
   is at least `min(0.48 * (1 - t/100), v_bg)`. Tolerance 50 on `0x00FF00`
   reproduces the green range above; the picked color is always background,
   and raising the tolerance never brings background back.
2. **Mask cleanup.** Morphological **opening with a 3x3** kernel on the
   foreground mask, to remove JPEG noise.
3. **Components.** Connected components with **8-connectivity** on the
   foreground; discard components whose area is **< 0.4% of the image area**.
4. **Transparency.** For each component take its bounding box. Alpha is 255
   where the pixel is **inside the component and not background-colored**, so
   interior gaps of background (e.g. between an arm and a weapon) also become
   transparent. Apply a light **3x3 blur to the alpha** channel to smooth edges.
5. **Ordering.** Sort into rows, then left to right within each row. Rows:
   sort by vertical center; the first sticker opens a row, and each next
   sticker joins it iff its vertical center is strictly above the
   lowest point (largest `y + height`) of the stickers already in the row, otherwise it opens a new
   row. Within a row, order by horizontal center (ties by top). This keeps a
   short sticker in the row of taller neighbors whose extent covers its center,
   with no pixel threshold.
6. **Framing.** Resize preserving aspect ratio to fit **480 px** (Lanczos3) and
   center in a transparent **512x512** frame (16 px margin on the long side).

## 5. Errors and warnings

The core exposes an `ErrorCode` enum; the frontend maps each code to a
localized message and shows it as a toast. In the browser, `detect` throws
the code name as a string. The codes are:

| Code              | Meaning                                                  |
|-------------------|----------------------------------------------------------|
| `NoStickers`      | No component survived noise removal and the 0.4% size filter. |
| `ImageTooLarge`   | Width or height above 8192, or more than 40,000,000 pixels. |
| `InvalidInput`    | A dimension is 0, the buffer length is not `width * height * 4`, the tolerance is above 100, the background is above `0xFFFFFF`, or `bbox(i)`/`rgba(i)` got `i >= count`. |

Checks run in that order (zero dimension, size limits, buffer length,
parameters); the first failure decides the code.

Splitting more than 30 stickers into several packs is **not** a core error:
`TooManyStickers` is an informational notice produced by the frontend export,
never by Rust.

## 6. Worker

- Created with
  `new Worker(new URL('$lib/worker.ts', import.meta.url), { type: 'module' })`.
- Initializes the wasm module **once** and exposes `detect` through Comlink.
- Pixel buffers cross the boundary as `Transferable` (no copies) in both
  directions.
- The wasm, the worker, and canvas APIs exist only in the browser, which is why
  the tool route disables SSR.

## 7. Frontend structure

- **Routes** (all localized; the base locale `pt-BR` has no prefix, other
  locales are prefixed):
  - `/` - the tool. `export const ssr = false`, with an SPA fallback page that
    respects the locale prefix.
  - how-to-use and about pages - prerendered for every locale (listed in
    `prerender.entries`). Slugs are translated: `/como-usar` and `/sobre` (pt-BR),
    `/en/how-to-use` and `/en/about`, `/es/como-usar` and `/es/acerca-de`.
- **State:** a runes store in `src/lib/state.svelte.ts` holding the source
  image, the detected stickers, the tolerance, the background color, and the
  chosen tray icon.
- **Feature components** in `src/lib/components/`, composed only from
  design-system components in `src/lib/components/ui/`:
  - `DropZone.svelte` - drag and drop, click to choose, Ctrl+V paste.
  - `Preview.svelte` - original image with detected boxes and the eyedropper.
  - `Controls.svelte` - tolerance slider; debounced live re-detection with
    progress feedback.
  - `Grid.svelte` - cropped stickers on a checkerboard; size badge, remove,
    mark as tray icon.
  - `Export.svelte` - "download pack" action and success toast.
  - `LanguageSwitcher.svelte`, `ThemeToggle.svelte` - in the header.
- UI, theming, accessibility, and i18n rules live in [DESIGN.md](DESIGN.md).

## 8. WhatsApp output rules

- Each sticker: **WEBP, 512x512, transparent** background.
- Static sticker size **<= ~100 KB**: lower the WEBP `quality` automatically
  until the blob fits.
- **3 to 30 stickers per pack.** More than 30 are split into several packs.
- **Tray icon:** 96x96 PNG generated from the sticker the user chose.
- **Locale-neutral file names:** `rusticker-pack-1.zip`, `sticker_01.webp`, ...

## 9. PWA and deployment

- `@vite-pwa/sveltekit` makes the app installable and fully usable offline
  (the wasm and all assets are precached).
- Output of `bun run build` is a static directory deployable to any static
  host. The target is **GitHub Pages**: `paths.base` comes from the
  `BASE_PATH` environment variable (set by the deploy workflow, empty in dev)
  and `404.html` is the SPA fallback.

## 10. Testing strategy (planned)

- **Rust unit tests** (in each `core/src` module) and **synthetic-image
  tests** (`core/tests/synthetic.rs`): images painted in code, no fixture
  files. They cover every `sticker-detection` scenario, for example a green
  background with three rectangles of different colors yielding exactly 3
  stickers in row-then-column order, interior gaps, soft edges, framing, the
  size filter, and every error code. Run with `cargo test`; CI runs them in
  `.github/workflows/rust.yml` together with fmt, clippy, and the wasm build.
- **Integration check (local only):** a private sample image (never
  committed; kept in the git-ignored `image/` folder) is expected to yield
  **17 stickers** in rows of 5, 6, and 6. `core/tests/sample_image.rs` reads
  its absolute path from `RUSTICKER_SAMPLE_IMAGE` and is skipped when the
  variable is unset, so CI never runs it:
  `RUSTICKER_SAMPLE_IMAGE=<abs path> cargo test --release -p rusticker-core --test sample_image -- --nocapture`.
- **i18n check** (`i18n:check`): fails when any locale is missing a key that
  exists in the base locale `pt-BR`.

## 11. Deferred (out of scope for now)

- Separating stickers that touch each other (distance transform + watershed).
- Non-uniform backgrounds via a segmentation model running in wasm
  (`ort` or `tract`).
- Right-to-left locales (the logical Tailwind utilities keep this possible).
