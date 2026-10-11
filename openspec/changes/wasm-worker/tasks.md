## 1. Setup and dependencies

- [x] 1.1 Work on branch `feature/wasm-worker` (Wave B, own worktree) created from `develop` only after both `core-detection` and `web-scaffold` are merged; runs in parallel with `design-tokens` and `pwa-seo`. Verify `git log develop --oneline` shows both merges and `core/` and `web/` exist in the worktree
- [x] 1.2 Build the core once: `wasm-pack build core --target web` from the repo root; verify `core/pkg/` contains `rusticker_core.js`, `rusticker_core.d.ts` and `rusticker_core_bg.wasm`, and the `.d.ts` exports `detect`, `Detection` and default `init` as in contract section 2
- [ ] 1.3 In `web/package.json` add `"rusticker-core": "file:../core/pkg"` and `comlink` to dependencies, `jpeg-js` to devDependencies, and scripts `build:wasm` (`wasm-pack build ../core --target web && bun install`) and `dev:all` (`bun run build:wasm && bun run dev`) without touching other entries; verify `bun run build:wasm` succeeds and `web/node_modules/rusticker-core/rusticker_core_bg.wasm` exists
- [ ] 1.4 Check lockfile stability: rebuild the wasm (`bun run build:wasm`), then run `bun install --frozen-lockfile` in `web/`; verify it passes (if it fails, record the fallback from design.md Risks and use it in task 6.1)
- [x] 1.5 Add the separated `wasm-worker` block to `web/vite.config.ts` (`worker.format: 'es'`, `optimizeDeps.exclude: ['rusticker-core']`) per design.md D1 without reformatting other lines; verify `git diff web/vite.config.ts` shows only the marked block and `bun run dev` starts

## 2. Detection module (web/src/lib/detection/)

- [x] 2.1 Write `types.ts` exactly per contract section 3 plus `DetectionError` constructor `(code, options?)` and `isCancelled(error)` (design D4/D5); verify `bun run check` passes
- [x] 2.2 Write `errors.ts` with `toDetectionError(result)` (core codes pass through; unknown strings, non-strings, `RuntimeError`, init failures -> `WorkerFailed` with `cause`) and `options.ts` with option validation/rounding and `0xRRGGBB` packing (design D6); add `errors.test.ts` and `options.test.ts`; verify `bun run test` passes
- [x] 2.3 Write `latest.ts`, the latest-wins scheduler (one in-flight, one pending, superseded calls rejected with `AbortError`, late stale results dropped) per design D4, plus `latest.test.ts` covering three rapid calls (only the third resolves, the second is never started), a late stale result, and dispose with pending work; verify `bun run test` passes
- [x] 2.4 Write `engine.ts` (pure `runDetect(request)` around `detect`: reads bboxes and sticker buffers, always calls `free()` in `finally`, returns the tagged union of design D2) and `worker.ts` (initializes the wasm once via the `?url` import and `init({ module_or_path })`, exposes `runDetect` through Comlink and transfers all sticker buffers); verify `bun run check` and `bun run lint` pass
- [x] 2.5 Write `index.ts` with `createDetector()`: eager module worker creation via `new URL('./worker.ts', import.meta.url)`, copy-then-transfer of the input buffer (design D3), conversion to `Sticker` (`id` `d<run>-s<index>`, `index`, `bbox`, 512x512 `pixels`), worker `error`/`messageerror` handling, poison-and-recreate on `WorkerFailed`, `dispose()`; re-export the public types; verify `bun run check` passes and importing the module in a prerendered page does not touch `Worker`
- [x] 2.6 Write `mock.ts` with `createMockDetector(config?)` per design D7 (deterministic grid boxes, 512x512 transparent images with an index-colored circle, shared scheduler and validation, `failWith`, `delayMs`, `ImageData` fallback for node) and `mock.test.ts` (same input gives identical output, count and order, `failWith`, `InvalidInput`, cancellation); verify `bun run test` passes

## 3. Localized error messages

- [x] 3.1 Add `error_no_stickers`, `error_image_too_large`, `error_invalid_input`, `error_worker_failed` to `web/messages/pt-BR.json`, `en.json` and `es.json` with the translations in design D5 (only `error_*` keys added); verify `bun run i18n:check` passes
- [x] 3.2 Write `messages.ts` with `detectionErrorMessage(code)` covering every `DetectionErrorCode` (exhaustive `switch` so a new code fails type-check) and a unit test asserting a non-empty message for each code; verify `bun run check` and `bun run test` pass

## 4. Local integration test (sample image, never committed)

- [x] 4.1 Write `web/src/lib/detection/detection.integration.test.ts` per design D8: `describe.skipIf(!process.env.RUSTICKER_SAMPLE_IMAGE)`, decode the JPEG from that absolute path with `jpeg-js`, init the wasm from the installed package bytes, call `runDetect` with background `0x00B140` and tolerance 50, assert 17 stickers in reading order (rows of 5/6/6) with 512*512*4-byte buffers; verify `bun run test` reports the suite as skipped without the variable, and passes locally with `RUSTICKER_SAMPLE_IMAGE=<abs path to image/...jpg> bun run test`
- [x] 4.2 Confirm the sample image was not copied anywhere: verify `git status --porcelain` lists no `.jpg`/`.jpeg` file and `web/static/` has no example image

## 5. Dev-only browser check

- [x] 5.1 Add `web/src/routes/_detection/+page.ts` (`ssr = false`, `prerender = false`, `load` throws 404 unless `dev`) and `+page.svelte` (native file input, `createImageBitmap` + `OffscreenCanvas` to `ImageData`, `createDetector().detect` with green background and tolerance 50, renders the count, elapsed ms and sticker canvases, logs codes/bboxes; no hardcoded copy) per design D9; verify with the Playwright spec `web/e2e/wasm-worker/detection.dev.spec.ts` (task 6.4, pre-wired `dev` project): a synthetic image gives the expected count, the page stays responsive during detection, and the wasm is requested once across repeated runs
- [x] 5.2 Verify error and stale-result paths in the same page: choosing an image with no stickers logs `NoStickers`; triggering several detections quickly logs cancelled results for all but the last; and `/_detection` returns 404 after `bun run build` and `bun run preview` (both automated in task 6.4)

## 6. CI, deploy, and base path

- [ ] 6.1 Verify the CI wiring pre-wired by `web-scaffold` (design D10; do NOT edit `.github/workflows/*`): on the pushed branch the `web` workflow's "Build wasm" step runs (not skipped) before `bun install --frozen-lockfile`, `rusticker-core` resolves, and check, lint, test (integration suite reported as skipped), i18n:check and build all pass; also confirm `git diff develop --stat -- .github/` is empty and that `deploy.yml` has the same guarded wasm steps (report any defect to the `web-scaffold` owner instead of patching)
- [x] 6.2 Verify the base path: `BASE_PATH=/Rusticker bun run build` then serve `web/build` under `/Rusticker` (e.g. `bun run preview`), confirm `web/build` holds the wasm as a hashed file (so `pwa-seo` can precache it), and that no same-origin request leaves the base path (automated in task 6.4, `base-path.spec.ts`).
- [x] 6.3 Run the full web pipeline locally: `bun run check`, `bun run lint`, `bun run test`, `bun run build`, `bun run i18n:check` in `web/`; verify all pass

- [ ] 6.4 Add Playwright specs under `web/e2e/wasm-worker/`, using the `dev` project that web-scaffold pre-wires (no config change): `detection.dev.spec.ts` (dev project: a synthetic image drawn in the test gives the expected count, no main-thread gap over 200 ms during detection, `NoStickers` and cancelled-result logs, one wasm request across three runs); `sample-image.dev.spec.ts` (dev project: 17 stickers from `RUSTICKER_SAMPLE_IMAGE`, skipped when unset); `production.spec.ts` (default project: `/_detection` is 404); `base-path.spec.ts` (default project, `BASE_PATH=/Rusticker`: same-origin requests stay under the base path). Verify `bun run test:e2e` passes locally and in the pre-wired CI step.

## 7. Documentation

- [x] 7.1 Update `ARCHITECTURE.md` section 3 (data flow: worker path `src/lib/detection/worker.ts`, input copy + transfer, latest-wins, `WorkerFailed`) and section 6 (worker: `?url` + `init`, init once, recycle on failure, build `core/pkg` before `bun install`), touching no other section; verify the sections describe the implemented module
- [ ] 7.2 Update the `CONTRIBUTING.md` setup section and the `README.md` quick start: in any fresh clone or worktree, run `bun run build:wasm` in `web/` (wasm-pack first, then `bun install`) before anything else; `dev:all` for day-to-day work; verify by following the steps in a fresh worktree (`bun run build:wasm`, then `bun run dev` starts)
- [x] 7.3 Add one bullet under `## [Unreleased]` in `CHANGELOG.md` for the detection runtime; verify `git diff develop --stat` lists only ARCHITECTURE.md, CONTRIBUTING.md, README.md, CHANGELOG.md among docs, plus this change's own files
