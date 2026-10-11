## Context

The repository has no Rust code yet: only `rust-toolchain.toml` (Rust 1.98, `rustfmt`, `clippy`, `wasm32-unknown-unknown`), prek hooks that already call `cargo fmt`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`, and `cargo check --workspace`, and a `.gitignore` that already ignores `target/`, `core/pkg/`, and `image/`. See proposal.md for motivation and scope.

Constraints that shape the design:

- **Wave A, parallel with `web-scaffold`.** This change may only touch root `Cargo.toml`/`Cargo.lock`, `core/**`, `.github/workflows/rust.yml`, and the cargo hooks in `.pre-commit-config.yaml`. `web/` does not exist on this branch, so the "reinstall the wasm package in `web/`" step is a no-op here; `wasm-worker` (Wave B) wires `core/pkg` into `web/`.
- **Binding API** from the shared contract section 2 (`detect`, `Detection`, error code strings, limits). `wasm-worker` codes against it in Wave B, so names and shapes must not drift.
- **Algorithm parameters** come from the validated Python/OpenCV prototype (ARCHITECTURE.md section 4). OpenCV is not allowed; only `image`, `imageproc`, `wasm-bindgen`.
- **Sample image** (2752x1536 JPEG, 17 stickers, rows of 5/6/6 with very different heights) is private, git-ignored, and absent from worktrees.

## Goals / Non-Goals

**Goals:**

- One pure-Rust pipeline, fully testable natively with `cargo test`, wrapped by a thin wasm-bindgen layer.
- Exact, documented definitions for the two places the brief is vague: tolerance mapping and row grouping.
- No panics on any input; every failure is an `ErrorCode`.
- CI that proves format, lint, tests, and the wasm build on every change to the core.

**Non-Goals:**

- Splitting touching stickers, non-uniform backgrounds, achromatic (white/gray/black) backgrounds tuned for quality.
- Multithreading in wasm (no `rayon`, no SharedArrayBuffer); detection runs single-threaded inside the worker.
- Progress reporting or cancellation from inside the core (the worker can terminate itself).
- Any wasm-in-browser test harness (`wasm-bindgen-test`); the browser path is exercised by `wasm-worker`.

## Decisions

### D1. Workspace and crate layout

```text
Cargo.toml              [workspace] members = ["core"], resolver = "3", shared [profile.*]
Cargo.lock              committed (the crate produces a binary artifact)
core/Cargo.toml         package rusticker-core, edition 2024, crate-type = ["cdylib", "rlib"]
core/src/lib.rs         public pure-Rust API, re-exports, input validation
core/src/error.rs       ErrorCode
core/src/color.rs       RGB -> HSV, Thresholds::from(background, tolerance), is_background
core/src/mask.rs        foreground mask + 3x3 opening
core/src/components.rs  8-connected labelling, per-label area + bbox, area filter
core/src/alpha.rs       per-sticker crop, alpha from label membership, 3x3 alpha average
core/src/frame.rs       premultiplied Lanczos3 fit to 480, center in 512x512
core/src/order.rs       row grouping + in-row ordering
core/src/wasm.rs        #[wasm_bindgen] detect + Detection (thin wrapper)
core/tests/synthetic.rs spec scenarios through the public API (images painted in code)
core/tests/sample_image.rs  local-only RUSTICKER_SAMPLE_IMAGE test
```

- `cdylib` is required by wasm-pack; `rlib` lets integration tests and future native tools link the crate. The library name is `rusticker_core`.
- Dependencies: `image` with `default-features = false` (the pipeline needs no codecs), `imageproc` with `default-features = false` (drops `rayon`, which does not work on `wasm32-unknown-unknown`), `wasm-bindgen`. Dev-dependency: `image` with the `jpeg` feature, used only by `sample_image.rs`. With resolver 3, dev-dependency features are not unified into the wasm build. Exact versions are the latest that compile on Rust 1.98, recorded in `Cargo.lock`.
- Root profiles: `[profile.release] opt-level = 3, lto = true, codegen-units = 1` (smaller, faster wasm) and `[profile.dev.package."*"] opt-level = 3` so image operations in debug-mode tests are not painfully slow.
- `wasm.rs` is compiled on every target (not `cfg(target_arch = "wasm32")`) so `cargo clippy` on the host lints it. Its methods delegate to native-testable inner methods that return `Result<_, ErrorCode>`; only the outermost layer converts to `JsValue`.
- Alternative considered: a separate `core-wasm` crate for bindings. Rejected: one more crate for a ~60-line wrapper, and the contract names a single package.

### D2. Public API

Pure Rust (names refine the contract, semantics unchanged):

```rust
pub enum ErrorCode { NoStickers, ImageTooLarge, InvalidInput }   // as_str() -> "NoStickers" ...
pub struct BBox { pub x: u32, pub y: u32, pub width: u32, pub height: u32 }
pub struct Sticker { pub bbox: BBox, pub image: RgbaImage /* 512x512 */ }

pub fn detect_stickers(image: &RgbaImage, background: Rgb<u8>, tolerance: u8)
    -> Result<Vec<Sticker>, ErrorCode>;
pub fn detect_rgba(rgba: &[u8], width: u32, height: u32, background: u32, tolerance: u8)
    -> Result<Vec<Sticker>, ErrorCode>;          // validates, then calls the shared pipeline
```

wasm (generated `.d.ts` must match contract section 2 exactly):

```rust
#[wasm_bindgen] pub fn detect(rgba: &[u8], width: u32, height: u32, background: u32, tolerance: u8)
    -> Result<Detection, JsValue>;               // Err(JsValue::from_str(code.as_str()))
#[wasm_bindgen] pub struct Detection { stickers: Vec<Sticker> }
  #[wasm_bindgen(getter)] fn count(&self) -> u32;
  fn bbox(&self, index: u32) -> Result<Vec<u32>, JsValue>;   // Uint32Array [x, y, w, h]
  fn rgba(&self, index: u32) -> Result<Vec<u8>, JsValue>;    // Uint8Array, 1_048_576 bytes
```

`free()` and the default `init` export are generated by wasm-bindgen / wasm-pack `--target web`. `rgba(i)` copies the buffer out of wasm memory; the worker then transfers that copy to the main thread, which is what the contract expects.

`ErrorCode` implements `Debug`, `Clone`, `Copy`, `PartialEq`, `Eq`, `std::error::Error`, and `Display` (printing the code name only, never prose).

### D3. Validation order and limits

Exactly the order in the spec: zero dimension -> `InvalidInput`; side > 8192 or `width as u64 * height as u64 > 40_000_000` -> `ImageTooLarge`; buffer length (`u64` arithmetic, no overflow) -> `InvalidInput`; tolerance > 100 or background > `0xFFFFFF` -> `InvalidInput`. Size is checked before length so an oversized image is reported as such even if the caller sent a bad buffer. `detect_stickers` runs the same checks except the buffer length (an `RgbaImage` is always consistent). The validation is a small private function so the 8000x5000 boundary can be unit-tested without allocating 160 MB.

### D4. Tolerance -> threshold mapping

For background `(h_bg, s_bg, v_bg)` in HSV (hue in degrees, S and V in 0..1, achromatic hue = 0) and tolerance `t` in 0..=100:

| Threshold            | Formula                              | t = 0         | t = 50, bg `0x00FF00` | t = 100 |
|----------------------|--------------------------------------|---------------|-----------------------|---------|
| hue half-width       | `t` degrees                          | 0°            | 50° -> 70°..170°      | 100°    |
| minimum saturation   | `min(0.94 * (1 - t/100), s_bg)`      | `min(0.94, s_bg)` | 0.47              | 0       |
| minimum value        | `min(0.48 * (1 - t/100), v_bg)`      | `min(0.48, v_bg)` | 0.24              | 0       |

A pixel is background iff circular hue distance <= half-width AND S >= min-S AND V >= min-V.

Why this shape:

- **Hue centered on the picked color, width = t degrees.** It makes "tolerance 50" literally mean ±50°, which is the prototype's band for green (center 120°). Linear and easy to explain in the UI.
- **Absolute S/V floors that shrink linearly to 0**, chosen so t = 50 lands on exactly 47% / 24%. Absolute (not relative to `s_bg`/`v_bg`) because the prototype's floors were absolute and worked across the whole JPEG-noisy background; relative floors would make a slightly darker pick much more permissive.
- **Capped by the picked color's own S and V**, so the picked color is always background (otherwise picking a dull green at low tolerance would produce `NoStickers` on a valid sheet).
- **Monotonic**: every threshold loosens as `t` grows, so raising the slider never brings back background. Tested as a property over a small grid of colors.
- The prototype is reproduced exactly only for a picked hue of 120°. The sample image background is a mid green at about hue 118°-120°, so tolerance 50 reproduces the prototype thresholds closely there (a more bluish pick such as `0x00B140`, about 142°, would shift the band to 92°-192°). The sample-image test remains the real-world check.

Alternatives considered: Euclidean distance in RGB or Lab (does not reproduce the prototype's HSV band, and treats brightness variations of the backdrop as foreground); per-channel ranges scaled from the picked color (makes t = 50 depend on the pick, losing the prototype numbers).

Implementation: HSV computed in `f32` per pixel with precomputed thresholds; the circular distance is `min(d, 360 - d)`. Tests probe points clearly on each side of each boundary (for example hue 69°/71°, saturation 46%/48%) rather than exact float equality.

### D5. Mask, opening, components

- Foreground mask: `GrayImage`, 255 = not background.
- Opening with a 3x3 square (erosion then dilation with an L-infinity radius-1 structuring element). Opening is anti-extensive: it only removes foreground, never adds it.
- Labelling: 8-connectivity on the opened mask, background label 0, `u32` labels.
- One linear pass over labels collects per-label pixel count and min/max x/y. A label is kept iff `count * 1000 >= 4 * width * height` (integer form of "not less than 0.4%"; `u64` arithmetic).
- Zero kept labels -> `NoStickers`.

### D6. Alpha (the brief's "inside the component AND not background")

Within the bounding box, raw alpha is 255 iff the pixel's label equals the sticker's label. Because opening only removes foreground, "label == this component" already implies "not background in the raw mask", so the conjunction from the brief reduces to label membership, and interior gaps (background, hence label 0) and other stickers' pixels (different label) are excluded for free. This is cheaper and clearer than re-evaluating the color test per pixel.

Edge softening: 3x3 box average of the raw alpha, treating pixels outside the bounding box as 0 (computed on a crop padded by one zero pixel, then cut back to the bbox). Result: interior 255, straight edge 170, convex corner 113. Colors are copied from the source; RGB is set to 0 wherever final alpha is 0.

Alternative considered: hole-filling the component and then applying the color test (closer to a literal reading of the brief). Rejected: same result for gaps larger than the opening, extra pass, and it would re-admit other stickers' pixels inside the bbox.

### D7. Framing

- `scale = 480 / max(w, h)`; new size `(max(1, round(w * scale)), max(1, round(h * scale)))`, so the long side is exactly 480 (upscaling allowed). Offset `((512 - nw) / 2, (512 - nh) / 2)` with integer division (floor).
- Resampling is Lanczos3 on **premultiplied** `f32` RGBA, then un-premultiplied, clamped to 0..255, rounded, and RGB zeroed where alpha is 0. Resizing straight alpha would blend the (now transparent) neighbors' colors into the edges, producing dark or green halos. Lanczos3 overshoot is removed by clamping.
- If the crop is already 480 on its long side, the resize is skipped (identity), which makes the spec's no-rescale scenarios exact.

### D8. Row grouping

Exactly the spec rule, implemented with doubled integers to stay exact: `cy2 = 2y + h`, `bottom2 = 2(y + h)`, `cx2 = 2x + w`.

1. Sort by `(cy2, cx2)`.
2. Open a row with the first sticker and track `row_bottom2 = max(bottom2)` of its members. The next sticker joins iff `cy2 < row_bottom2`; otherwise it opens a new row.
3. Sort each row by `(cx2, y)`.

Why: in the sample image, stickers in one row differ in height by up to ~2x (for example the small logo and tiny creature in row 3 versus full-height stickers), so "same row if centers are within k pixels" needs a magic constant that depends on scale. Using the vertical extent already present in the row is scale-free: a sticker belongs to the row if its center sits inside the row's band. In the sample, rows are separated by clear background gaps, so every row-2 center is well below every row-1 bottom.

Known limitation (accepted): a very tall sticker can extend `row_bottom2` and pull the next row's first sticker into its row (chaining). It needs a sticker reaching past the next row's centers, which does not happen in sticker sheets with visible row gaps.

Alternatives considered: fixed pixel threshold (scale-dependent); k-means / gap detection on center-y histogram (more complex, needs a row count or gap heuristic); interval overlap of whole boxes (fails when a short sticker sits only near the bottom of a tall neighbor, and chains even more).

### D9. Tests

- **Unit tests** (in modules): HSV conversion, the t = 50 green band (points inside/outside each boundary), monotonicity grid, picked color always background, validation boundaries (8192/8193, 8000x5000 vs 8000x5001, buffer length, tolerance 101, background `0x1000000`), opening removes a 2x2 speck and keeps a 3x3 block, area threshold at exactly 0.4%, row grouping on bare bboxes (mixed heights, row break, ties), alpha average values (170/113), `Detection` inner index checks.
- **Integration tests** (`tests/synthetic.rs`): images painted in code on `0x00FF00`, covering every spec scenario through `detect_stickers`/`detect_rgba`: 3 rectangles red/blue/yellow in order, two rows with a tall/short pair, ring-shaped sticker with transparent hole, neighbor inside bbox excluded, solid 480x240 soft edge, framing offsets for 200x100 and 50x100, transparent margins and `(0,0,0,0)` transparent pixels, noise and small-region discard, `NoStickers`, each `InvalidInput`/`ImageTooLarge` path, determinism.
- **Sample test** (`tests/sample_image.rs`): reads `RUSTICKER_SAMPLE_IMAGE`. Unset -> prints `skipped: RUSTICKER_SAMPLE_IMAGE not set` to stderr and returns (Rust has no runtime "skip" status; the test passes, and the message is visible with `--nocapture`). Set but unreadable -> fails (misconfiguration should be loud). Background = mean color of the 16x16 top-left corner block; tolerance 50. Asserts 17 stickers and, splitting the result into consecutive groups of 5, 6, 6: x-centers strictly increase within each group and every center-y of a group is less than every center-y of the next group. Recommended invocation: `cargo test --release -p rusticker-core --test sample_image -- --nocapture`.
- The sample image is never copied: no fixture files, no `include_bytes!`.

### D10. CI and hooks

`.github/workflows/rust.yml`:

- Triggers: `push` to `main` and `develop`, and `pull_request` targeting either, with `paths` filter on `core/**`, `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.github/workflows/rust.yml`. `permissions: contents: read`; concurrency group per ref with cancel-in-progress.
- One `ubuntu-latest` job: checkout; `rustup toolchain install` (reads `rust-toolchain.toml`); `Swatinem/rust-cache@v2`; `cargo fmt --all --check`; `cargo clippy --workspace --all-targets --all-features -- -D warnings`; `cargo clippy -p rusticker-core --target wasm32-unknown-unknown -- -D warnings`; `cargo test --workspace`; install wasm-pack with `taiki-e/install-action` (prebuilt binary, faster than `cargo install`); `wasm-pack build core --target web`; assert `core/pkg/rusticker_core.d.ts` exports `detect` and `class Detection`.
- `RUSTICKER_SAMPLE_IMAGE` is never set in CI.

`.pre-commit-config.yaml`: add `stages: [pre-commit]` to `cargo-fmt`, `cargo-clippy`, `cargo-check`. Hooks are installed for both `pre-commit` and `commit-msg`; without an explicit stage the cargo hooks also run (again) during `commit-msg`. Nothing else in the file changes.

## Risks / Trade-offs

- [`imageproc` pulls `rand`/`getrandom`, which may not compile for `wasm32-unknown-unknown` without a JS backend] -> First task builds the empty crate with all dependencies for the wasm target. If it fails, enable the `getrandom` wasm/JS backend through a target-specific dependency in `core/Cargo.toml`; if that backend also needs a `--cfg` flag, add a root `.cargo/config.toml` with the target-specific flag for `wasm32-unknown-unknown` (owned by this change per contract addendum R9). Because `wasm-pack build core` and root-level `cargo` commands both resolve config upward from the repo, the root location covers CI, hooks, and local builds.
- [Memory at the 40 MP limit: input copy 160 MB + labels 160 MB + mask 40 MB inside wasm linear memory] -> Within the 4 GB wasm32 limit and the contract's chosen bound; free the mask and labels before framing; `wasm-worker` can test a large image on low-end devices.
- [Debug-mode tests are slow on large images] -> dependency opt-level 3 in the dev profile; the sample test is documented with `--release`.
- [Sample image yields 16 or 18 stickers (touching outlines, a detached text fragment)] -> The prototype produced 17 with the same parameters; if the Rust port differs, investigate opening/connectivity parity before changing thresholds, and update the spec rather than special-casing the test.
- [Tolerance passed from JS outside 0..255 is truncated by wasm-bindgen before reaching Rust] -> The UI slider is bounded to 0..100; values 101..255 still return `InvalidInput`.
- [Achromatic backgrounds: with a white/gray/black pick, hue is meaningless (0) and the white sticker outlines may be classified as background] -> Documented as unsupported for now; behavior stays deterministic and never panics.
- [Row chaining by a very tall sticker] -> See D8; covered by the sample test; revisit only with a real failing sheet.

## Migration Plan

Additive: new workspace and crate, a new workflow, and a stage restriction on existing hooks. No data or users to migrate. Rollback is reverting the merge commit; `web/` does not depend on `core/pkg` until `wasm-worker` (Wave B).

## Open Questions

- **Contract extensions (accepted by the coordinator; `wasm-worker` must handle them):** (a) `InvalidInput` is also returned for tolerance > 100 and background > `0xFFFFFF`; (b) `bbox(i)`/`rgba(i)` with `i >= count` throw `InvalidInput`. The contract lists neither case; both only add failure paths that the UI cannot trigger.
- **Achromatic backgrounds:** whether to add a non-hue distance for low-saturation picks is deferred to a later change; it does not affect this API.
