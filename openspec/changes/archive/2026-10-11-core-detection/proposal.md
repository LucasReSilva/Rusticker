## Why

Rusticker's whole value is turning one sheet of stickers into individual, background-free stickers, and nothing in the repository does that yet. The detection pipeline was validated in a Python/OpenCV prototype; this change ports it to a Rust crate that compiles to WebAssembly, so the rest of the roadmap (worker, editor UI, export) has a tested, stable core to build on.

## What Changes

This change touches **`core/` only** (plus the root Cargo workspace, the Rust CI workflow, and the Rust hooks in `.pre-commit-config.yaml`). It does **not** touch `web/`.

- **Wave A**, branch `feature/core-detection`, starts from `develop`, runs in parallel with `web-scaffold`. No dependencies on other roadmap changes.
- Add a root Cargo workspace (`members = ["core"]`) and the crate `core/` named `rusticker-core` (library usable both natively and as a WebAssembly module).
- Implement the six-step detection pipeline from the brief: background classification from a picked color and a 0-100 tolerance, 3x3 noise opening, 8-connected components, discard of components below 0.4% of the image area, per-sticker alpha (inside the component and not background, so interior gaps become transparent) with a 3x3 edge softening, row-then-column ordering, and framing into a transparent 512x512 image with the sticker fitted to 480 px.
- Define the exact tolerance-to-threshold mapping (tolerance 50 on pure green reproduces the prototype: hue 70°-170°, saturation >= 47%, value >= 24%) and an exact row-grouping rule that works when stickers in one row have very different heights.
- Report failures only as the codes `NoStickers`, `ImageTooLarge`, `InvalidInput` (limits: width or height > 8192, or width*height > 40,000,000, is too large).
- Expose the WebAssembly API from the shared contract (`detect(rgba, width, height, background, tolerance) -> Detection` with `count`, `bbox(i)`, `rgba(i)`) and a pure-Rust API for tests.
- Tests: synthetic-image unit tests (3 stickers in order, two-row ordering with mixed heights, interior-gap transparency, noise discard, each error code) and a local-only integration test against the private sample image, read from `RUSTICKER_SAMPLE_IMAGE` and skipped when that variable is unset.
- CI: `.github/workflows/rust.yml` (format check, clippy with warnings denied, tests, `wasm-pack build core --target web`). Restrict the three cargo hooks in `.pre-commit-config.yaml` to the `pre-commit` stage.
- Update the core sections of `ARCHITECTURE.md` and `README.md` and add one `CHANGELOG.md` bullet.

Out of scope (even though the brief mentions them nearby):

- The Web Worker, Comlink wiring, and any `web/` code or `web/package.json` dependency (`wasm-worker`).
- Splitting into packs of at most 30 stickers and the `TooManyStickers` notice: a frontend export concern (`whatsapp-export`), not a Rust error.
- WEBP/PNG encoding, the tray icon, and the `.zip` (`whatsapp-export`).
- Separating stickers that touch each other (watershed) and non-uniform backgrounds (deferred).
- Committing or copying the sample image anywhere in the repository (forbidden).

## Capabilities

### New Capabilities
- `sticker-detection`: detecting stickers on a uniform-color background in an RGBA image and returning each one as an ordered, background-free 512x512 RGBA image with its source bounding box, or a failure code.

### Modified Capabilities

(none)

## Impact

- **File ownership (this change only):** root `Cargo.toml`, `Cargo.lock`, `.cargo/config.toml` (only if the wasm32 build needs `getrandom` backend configuration; contract addendum R9), `core/**`, `.github/workflows/rust.yml`, `.pre-commit-config.yaml` (cargo hooks' `stages` only); last task edits only the core-related sections of `ARCHITECTURE.md` and `README.md` and adds one bullet to `CHANGELOG.md`. No file under `web/`.
- **Public API (consumed by `wasm-worker`):** package `rusticker-core` built into `core/pkg/` (git-ignored) with the exports defined in the shared contract section 2. Error codes cross the boundary as the strings `NoStickers`, `ImageTooLarge`, `InvalidInput`.
- **Dependencies:** Rust crates `image`, `imageproc`, `wasm-bindgen`. No OpenCV. Native tooling: `wasm-pack`.
- **Privacy:** pure computation on an in-memory buffer; no I/O or network access in the library. The sample image is read only by a local test via an environment variable and never enters the repository.
