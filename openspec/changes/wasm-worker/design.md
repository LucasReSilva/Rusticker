## Context

See proposal.md (Why). Starting state after Wave A:

- `core-detection` publishes `rusticker-core` (built to `core/pkg` with `wasm-pack --target web`), exporting `detect(rgba, width, height, background: 0xRRGGBB, tolerance: 0..=100) -> Detection` (throws a string code `NoStickers` / `ImageTooLarge` / `InvalidInput`), `Detection { count, bbox(i) -> Uint32Array[4], rgba(i) -> Uint8Array(512*512*4), free() }`, and a default `init(input?)`. Stickers are already ordered.
- `web-scaffold` provides the SvelteKit app (adapter-static, `paths.base` from `BASE_PATH`, SPA fallback `404.html`), Paraglide catalogs, vitest, `web.yml` and `deploy.yml` workflows.
- `core/pkg` is git-ignored and `file:` dependencies are copied by `bun install`, so the package must be built before installing.
- The frontend contract (types, `createDetector`, `createMockDetector`, worker file location) is fixed by the shared contract, section 3. `tool-ui` will call `detect` from a debounced tolerance slider, so overlapping calls are normal.
- Parallel in Wave B: `design-tokens` (UI kit, `/_design`) and `pwa-seo` (service worker, precache, own block in `vite.config.ts`).

## Goals / Non-Goals

**Goals:**
- One worker per detector, wasm instantiated once per worker, no pixel copies across the thread boundary beyond one defensive copy of the input.
- A small, typed, framework-free API (`web/src/lib/detection/`) that `tool-ui` and `whatsapp-export` consume without knowing about wasm or Comlink.
- Works in `bun run dev`, in a production build under `/Rusticker`, and is precacheable by `pwa-seo` without changes here.
- Testable in CI without the sample image; verifiable locally with it.

**Non-Goals:**
- Interrupting a running wasm call (it is synchronous; it cannot be pre-empted without killing the worker).
- Caching the input image inside the worker across calls (possible later optimization, see Risks).
- Any UI beyond a dev-only diagnostics page; any service-worker configuration.

## Decisions

### D1. Load the wasm with a `?url` import + `init({ module_or_path })`, not `vite-plugin-wasm`

In `worker.ts`:

```ts
import init, { detect } from 'rusticker-core';
import wasmUrl from 'rusticker-core/rusticker_core_bg.wasm?url';
const ready = init({ module_or_path: wasmUrl }); // created once at worker module evaluation
```

Rationale:
- `--target web` output is designed for exactly this: explicit async `init(url)`. `vite-plugin-wasm` targets the ESM-integration style (`--target bundler`), needs `vite-plugin-top-level-await` and must also be registered under `worker.plugins`; more moving parts for no gain.
- A `?url` import makes Vite emit the binary as a hashed asset in the build output and rewrite the URL with the configured base, so it resolves under `/Rusticker/` on GitHub Pages and to `/` in dev.
- Because it is a plain `*.wasm` file in the build output, `pwa-seo` precaches it by including `wasm` in its glob patterns; no runtime fetch to any other origin.
- The object form `{ module_or_path }` avoids the deprecation warning of passing a bare URL in recent wasm-bindgen.

Alternatives: `vite-plugin-wasm` (rejected above); letting the glue resolve `new URL('rusticker_core_bg.wasm', import.meta.url)` by itself (breaks under Vite dependency pre-bundling in dev, and the file is not guaranteed to be emitted in worker builds); inlining the wasm as base64 (bloats the worker JS by ~33% and defeats separate caching).

`vite.config.ts` gets one clearly separated block (no other lines touched):

```ts
// --- wasm-worker: detection worker + wasm (owned by change wasm-worker) ---
worker: { format: 'es' },                       // module worker, matches { type: 'module' }
optimizeDeps: { exclude: ['rusticker-core'] },  // keep the wasm glue un-prebundled in dev
// --- end wasm-worker ---
```

If the file uses a `defineConfig({ ... })` object, the block is added as properties; if `pwa-seo` merges first, keep both blocks separate.

### D2. Module worker + Comlink, result returned as a tagged union (not thrown)

- `index.ts` creates `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` and wraps it with `Comlink.wrap<WorkerApi>`.
- `worker.ts` exposes `WorkerApi.detect(request)`:
  - `request = { rgba: ArrayBuffer, width, height, background: number /*0xRRGGBB*/, tolerance: number }`.
  - Awaits `ready` (D1), wraps the buffer in `Uint8Array`, calls `detect`, then for `i in 0..count` reads `bbox(i)` and `rgba(i)` (each `rgba(i)` is a fresh JS-owned `Uint8Array`, not a view into wasm memory), and calls `detection.free()` in a `finally`.
  - Returns `{ ok: true, stickers: [{ bbox: [x,y,w,h], rgba: ArrayBuffer }] }` with `Comlink.transfer(result, buffers)`; or `{ ok: false, code }` when `detect` throws a string that is one of the three core codes; or `{ ok: false, code: 'WorkerFailed', detail }` for anything else (non-string throw, unknown string, wasm `RuntimeError` such as a Rust panic, init failure).
- Returning a union instead of throwing avoids depending on how Comlink serializes non-`Error` throws and keeps the error mapping in one pure function (`toDetectionError`) that is unit-tested.
- Any `WorkerFailed` (including the worker's `error` / `messageerror` events, which reject all in-flight calls) marks the worker as poisoned: it is terminated and a new one is created lazily on the next `detect` call (spec "Recovery after engine failure"). A panicked wasm instance must not be reused.

Alternative considered: raw `postMessage` with a hand-written request/response protocol. Rejected: Comlink is the brief's choice, tiny, and gives typed proxies; the tagged union already removes its only weak spot.

### D3. Buffer transfer policy

- Main -> worker: `index.ts` sends `image.data.slice().buffer` and transfers it. One copy on the main thread (about 17 MB for 2752x1536, a few ms) keeps the caller's `ImageData` usable, which `tool-ui` needs to re-run detection when the slider moves. Transferring the caller's own buffer would detach it.
- Worker -> main: every sticker buffer is transferred, no copy. The main thread builds `new ImageData(new Uint8ClampedArray(buffer), 512, 512)`.
- `Detection.free()` is always called in the worker, including when reading a sticker throws.

### D4. Latest-wins scheduling (stale results discarded)

`index.ts` keeps at most one request *in flight* (sent to the worker) and at most one *pending* (not sent yet), each with a monotonically increasing sequence number:

1. `detect()` validates options (D6), creates a request, and:
   - if nothing is in flight: sends it immediately;
   - otherwise: the existing pending request (if any) is rejected as cancelled and replaced; the in-flight request is rejected as cancelled immediately (its caller is not kept waiting) but its worker job keeps running, because a synchronous wasm call cannot be interrupted.
2. When the in-flight job finishes, its result is delivered only if it was not cancelled; otherwise it is dropped (the transferred buffers are simply released to GC). Then the pending request, if any, is sent.

So the worker never queues more than one job, intermediate slider positions are never computed, and the newest request starts as soon as the worker is free. Terminating and recreating the worker on every supersede was rejected: it would re-fetch/re-compile the wasm and lose the "initialized once" property.

Cancellation is signalled by rejecting with a `DOMException` whose `name` is `'AbortError'` (the web platform convention for aborted async work), not with a `DetectionError`, so it is never mistaken for a failure to show. `types.ts` exports `isCancelled(error): boolean`; `tool-ui` ignores those rejections. This scheduling logic lives in a small pure module (`latest.ts`) that both the real and the mock detector use, so the semantics are identical and unit-tested once.

### D5. Errors, ids, and the public surface

- `DetectionError extends Error` with `readonly code: DetectionErrorCode`, `name = 'DetectionError'`, `message = code` (diagnostic only, never shown), optional `cause` carrying the worker's `detail` for `WorkerFailed`.
- Sticker ids: `` `d${run}-s${index}` `` where `run` is a module-level counter incremented per delivered result; unique for the page session without needing `crypto.randomUUID`.
- `messages.ts` exports `detectionErrorMessage(code): string` returning the Paraglide message for the code (`error_no_stickers`, `error_image_too_large`, `error_invalid_input`, `error_worker_failed`) in the active locale. It is the only place that maps codes to text, so `tool-ui` just calls it inside a toast. Messages are added to all three catalogs with real translations:

  | key | pt-BR | en | es |
  |---|---|---|---|
  | `error_no_stickers` | Nenhuma figurinha encontrada. Escolha a cor de fundo com o conta-gotas ou ajuste a tolerância. | No stickers found. Pick the background color with the eyedropper or adjust the tolerance. | No se encontraron stickers. Elige el color de fondo con el cuentagotas o ajusta la tolerancia. |
  | `error_image_too_large` | Imagem grande demais. Reduza a resolução e tente de novo. | Image too large. Reduce its resolution and try again. | Imagen demasiado grande. Reduce su resolución e inténtalo de nuevo. |
  | `error_invalid_input` | Não foi possível ler esta imagem. Tente outro arquivo. | This image could not be read. Try another file. | No se pudo leer esta imagen. Prueba con otro archivo. |
  | `error_worker_failed` | O processamento falhou. Recarregue a página e tente de novo. | Processing failed. Reload the page and try again. | El procesamiento falló. Recarga la página e inténtalo de nuevo. |

- `createDetector()` touches `Worker` only when called (never at module import), so the module is safe to import from prerendered/SSR code; it must only be called in the browser. The worker is created eagerly in `createDetector()` so wasm download/compile overlaps with the user choosing a file.
- `dispose()` terminates the worker, rejects in-flight/pending requests as cancelled; later `detect()` calls reject with `WorkerFailed`.

### D6. Option validation on the main thread

`background` channels must be integers 0-255 and `tolerance` is rounded with `Math.round` then must be within 0-100; otherwise `detect` rejects with `InvalidInput` without contacting the worker. The background is packed as `(r << 16) | (g << 8) | b`. Image-shape checks (`data.length === w*h*4`, non-zero sides, size limits) are left to the core so there is one source of truth for the limits.

### D7. Mock detector

`createMockDetector(config?: { count?: number = 6; failWith?: DetectionErrorCode; delayMs?: number = 0 }): Detector` (extra optional parameter; the contract's zero-argument call still works).
- Lays out `count` bounding boxes in a deterministic grid over the input's width/height (rows of up to 3), in reading order.
- Each sticker image is 512x512 with a transparent background and an opaque filled circle whose color is derived from the index (fixed palette), so whatsapp-export tests get realistic alpha.
- Uses the same `latest.ts` scheduler and the same option validation (D6), so cancellation and `InvalidInput` behave like the real detector.
- When `ImageData` is not defined (node test environment), it builds a structurally compatible `{ data, width, height, colorSpace: 'srgb' }` object; the factory is shared with `index.ts` to keep one code path.

### D8. Tests

- **Unit (vitest, CI):** `toDetectionError` mapping (each core code, unknown string, non-string, `RuntimeError`), option validation and packing, `latest.ts` scheduling (three rapid calls: only the last resolves, the middle one is never sent, late stale result dropped), mock determinism and `failWith`, `isCancelled`.
- **Integration (vitest, local only):** `detection.integration.test.ts` uses `describe.skipIf(!process.env.RUSTICKER_SAMPLE_IMAGE)`. It reads the JPEG from that absolute path, decodes it with `jpeg-js` (devDependency; Node has no JPEG decoder), reads `rusticker_core_bg.wasm` from the installed package and calls `init({ module_or_path: bytes })`, then calls the worker's pure handler (`runDetect`, exported from a `engine.ts` module that `worker.ts` wraps) with background `0x00B140` and tolerance 50, and asserts 17 stickers, bboxes in reading order (5/6/6 rows), and 512*512*4-byte buffers. This exercises the wasm, error mapping and `free()` path; the real `Worker` + Comlink path is verified by Playwright (D9; vitest in node has no module workers). The image is never copied into the repo.

### D9. Dev-only diagnostics page

`web/src/routes/_detection/+page.ts` sets `ssr = false`, `prerender = false`, and its `load` throws `error(404)` unless `dev` (`$app/environment`). `+page.svelte` contains only a native file input (browser-localized), the elapsed time and sticker count as numbers, and the sticker images on canvases; it logs codes and bboxes to the console. No hardcoded copy, so no catalog keys are needed. It uses `createImageBitmap` + `OffscreenCanvas` only to obtain `ImageData` for testing; the real file pipeline belongs to `tool-ui`. It is unlinked and can be deleted once `tool-ui` exists.

**E2E (Playwright, dev project).** `web/e2e/wasm-worker/detection.spec.ts` runs against `bun run dev`, the only place `/_detection` exists. Playwright gets a separate `dev` project (its own `webServer: bun run dev`, `BASE_PATH` unset) next to web-scaffold's default build-and-preview project; this change adds that one entry to `web/playwright.config.ts` and changes nothing else there. The spec draws its synthetic images in the test, so it runs in CI. The sample-image spec is skipped unless `RUSTICKER_SAMPLE_IMAGE` is set.

### D10. CI and deploy workflows (no edits; verify the pre-wired steps)

Per contract addendum R1, `web-scaffold` already ships `web.yml` and `deploy.yml` with Rust (toolchain file) + wasm-pack setup and a "Build wasm" step (`wasm-pack build core --target web`), all guarded by `if: hashFiles('core/Cargo.toml') != ''` and placed before `bun install --frozen-lockfile`. Once `core-detection` is merged the guard is true, so this change edits neither file. It only verifies on its pushed branch that "Build wasm" runs (not skipped), that `bun install --frozen-lockfile` resolves `rusticker-core`, and that check, lint, test (integration suite reported as skipped because `RUSTICKER_SAMPLE_IMAGE` is never set), i18n:check and build all pass. If the pre-wired steps are missing or wrong, that is a `web-scaffold` defect to report, not something to patch here.

`build:wasm` = `wasm-pack build ../core --target web && bun install`; `dev:all` = `bun run build:wasm && bun run dev`.

## Risks / Trade-offs

- [Fresh clones fail at `bun install` until `core/pkg` exists] → `build:wasm` documented in ARCHITECTURE, CONTRIBUTING setup and README quick start (contract R8); CI builds wasm first via the pre-wired step. Parallel Wave B branches (`design-tokens`, `pwa-seo`) need `bun run build:wasm` after rebasing on main.
- [`bun.lock` may record the copied `file:` package in a way that changes when the wasm is rebuilt, breaking `--frozen-lockfile`] → verify in task 1.x by building, installing, rebuilding and running `bun install --frozen-lockfile`; if it breaks, report it to the coordinator / `web-scaffold` owner (the workflows are not edited here, R1) and document the workaround.
- [Wasm binary larger than the PWA precache default limit (2 MiB)] → coordination note for `pwa-seo`: include `wasm` in glob patterns and raise `maximumFileSizeToCacheInBytes` if needed. Not configured here.
- [Superseded jobs still burn CPU until the running wasm call ends] → bounded to one job by D4; acceptable for a debounced slider.
- [One input copy per call (~17 MB)] → acceptable; later optimization: worker keeps the last input keyed by an image token so slider changes send only options.
- [Wasm panic leaves the instance unusable] → D2 recycles the worker on any `WorkerFailed`.
- [Module workers unsupported in very old browsers] → targets are evergreen browsers (Firefox >= 114, Safari >= 15, Chromium); out of scope.
- Privacy: the only fetch is the same-origin wasm asset; pixels move only between the main thread and the worker. Nothing here can send user data off-device.

## Migration Plan

Additive. Rollback = revert the merge; `tool-ui`/`whatsapp-export` have not started. After merge, developers run `bun run build:wasm` once before `bun install`.

## Open Questions

- **Contract additions (not changes):** `isCancelled()` helper + `AbortError` rejection for superseded calls (the contract only says `detect` "rejects with DetectionError"; cancellation is deliberately not a `DetectionErrorCode`); `detectionErrorMessage()` in `messages.ts`; optional `config` argument to `createMockDetector`; `DetectionError` constructor `(code, options?)`.
- **Ownership additions:** `web/src/routes/_detection/**` (dev-only page) and devDependency `jpeg-js` are not listed in the contract's file-ownership table (both accepted by the coordinator).
- `/_detection` is kept; `tool-ui` may remove it later (harmless either way, it 404s in production).
- Integration test placement: it must run in the vitest `server` (node) project set up by `web-scaffold` (R4); the file name/location follows whatever pattern that project includes.
