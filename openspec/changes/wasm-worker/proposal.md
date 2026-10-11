## Why

The Rust core (`core-detection`) can detect stickers and the web shell (`web-scaffold`) exists, but nothing connects them: the browser cannot yet run detection, and the next changes (`tool-ui`, `whatsapp-export`) need a stable, typed, testable detection API to build on. This change delivers that runtime so detection runs off the main thread, errors arrive as codes the UI can translate, and other changes can test against a mock without compiling Rust.

## What Changes

This change touches **`web/` only**; it does not edit any CI workflow (they are pre-wired by `web-scaffold`). It consumes `core/pkg` (built from `core/`) but does not modify `core/`.

- Add the local dependency `"rusticker-core": "file:../core/pkg"` and the `comlink` dependency to `web/package.json`.
- Add scripts `build:wasm` (build the core to wasm with `--target web`, then `bun install` to refresh the copied package) and `dev:all` (`build:wasm`, then the Vite dev server).
- Load the wasm binary as a normal hashed static asset (`?url` import passed to `init`), so it respects the GitHub Pages base path and can be precached by the PWA later; add a clearly separated wasm block to `web/vite.config.ts` (module worker format, exclude the package from dependency pre-bundling).
- Implement the frontend detection contract (shared contract, section 3) in `web/src/lib/detection/`:
  - `types.ts` – `Detector`, `Sticker`, `BBox`, `DetectOptions`, `DetectionErrorCode`, `DetectionError`.
  - `worker.ts` – module Web Worker that initializes the wasm exactly once, runs `detect`, always frees the native result, and transfers pixel buffers back.
  - `index.ts` – `createDetector()`: spawns the worker, transfers the input buffer, maps failures to `DetectionError` codes, applies a **latest-wins** policy for overlapping calls, and recovers from worker crashes as `WorkerFailed`.
  - `mock.ts` – `createMockDetector()`: deterministic synthetic stickers with the same semantics, for `tool-ui` / `whatsapp-export` tests.
  - `messages.ts` – maps each `DetectionErrorCode` to its localized message (for toasts in `tool-ui`).
- Add messages `error_no_stickers`, `error_image_too_large`, `error_invalid_input`, `error_worker_failed` to all three catalogs (pt-BR, en, es).
- Add a dev-only diagnostics page (`/_detection`) to verify detection end-to-end in the browser before the real UI exists; it returns 404 in production builds.
- Tests: unit tests for error mapping, latest-wins and the mock; a **local-only** integration test that runs the real wasm on the image at `RUSTICKER_SAMPLE_IMAGE` and expects 17 stickers, skipped when the variable is unset.
- CI: no workflow edits. `web-scaffold` pre-wires guarded Rust/wasm-pack setup and a "Build wasm" step before `bun install --frozen-lockfile` in `web.yml` and `deploy.yml`; this change only verifies those steps now run and that the web pipeline is green with the new dependency.
- Docs: update the ARCHITECTURE.md data-flow/worker sections, the CONTRIBUTING.md setup and README quick start (run `bun run build:wasm` first in any fresh clone or worktree); one CHANGELOG bullet.

Out of scope (even though the brief mentions them nearby):
- Any change to the detection algorithm, the wasm API, or anything in `core/` (owned by `core-detection`).
- Reading files, paste/drag-drop, `createImageBitmap` decoding, the eyedropper, the slider, debouncing, toasts, and the state store (owned by `tool-ui`).
- WEBP encoding, pack splitting / `TooManyStickers` notice, zip (owned by `whatsapp-export`).
- Service worker, precache configuration and offline install (owned by `pwa-seo`; this change only guarantees the wasm is a precacheable static asset).
- Committing or copying the sample image anywhere in the repository (no `web/static/example.jpg`).

## Capabilities

### New Capabilities
- `detection-runtime`: how the web app runs sticker detection in the browser – off the main thread, single initialization, ordered results, error codes, stale-result discarding, crash recovery, offline operation once loaded, and a deterministic test double.

### Modified Capabilities
<!-- none -->

## Impact

- **Wave:** B (branch `feature/wasm-worker`). **Depends on:** `core-detection` and `web-scaffold` merged to `develop`. Runs in parallel with `design-tokens` and `pwa-seo`. **Unblocks:** `tool-ui`, `whatsapp-export` (Wave C).
- **Files owned (create/modify):** `web/src/lib/detection/**`; `web/src/routes/_detection/**` (dev-only page, new); `web/e2e/wasm-worker/**` and an additive `dev` Playwright project in `web/playwright.config.ts`; a separated wasm block in `web/vite.config.ts`; deps `comlink`, `rusticker-core` and devDependency `jpeg-js` (integration test only) plus scripts `build:wasm`, `dev:all` in `web/package.json` / `web/bun.lock`; keys `error_*` in `web/messages/{pt-BR,en,es}.json`.
- **Not edited:** `.github/workflows/web.yml` and `deploy.yml` (owned and pre-wired by `web-scaffold`).
- **Docs:** ARCHITECTURE.md sections 3 and 6 (data flow, worker), CONTRIBUTING.md setup, README quick start, one bullet in CHANGELOG.md under Unreleased.
- **Developer workflow:** after this merges, `bun install` in `web/` requires `core/pkg` to exist; run `bun run build:wasm` (or `wasm-pack build core --target web`) first. CI does this automatically through the pre-wired "Build wasm" step.
- **Privacy:** no network requests other than fetching the app's own wasm asset from the same origin; image pixels stay in the browser (main thread and worker).
