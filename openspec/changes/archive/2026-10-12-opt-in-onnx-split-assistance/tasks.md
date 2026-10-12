## 1. Model and runtime proof of concept

- [ ] 1.1 Add a reproducible model manifest with the immutable repository revision, exact byte sizes, published SHA-256 values, Apache-2.0 attribution, ONNX opset, input/output shapes, and prompt-label contract. Verify the downloaded files with `cargo test -p rusticker-onnx-assist model_manifest`.
- [ ] 1.2 Prove a Rust/WASM-compatible decoder route by baking `orig_im_size` into a per-resolution ONNX variant or another stable, supported graph transformation; avoid relying on `tract-hir`/`tract-core` internals unless the facade limitation is explicitly accepted. Verify native encoder-to-decoder inference and compile for `wasm32-unknown-unknown`, including the required `psm` C toolchain and `getrandom/wasm_js` configuration.
- [ ] 1.3 Execute encoder and prompted decoder inference in a real browser worker, compare numerical outputs with the upstream reference, and record unsupported operators, model/runtime bytes, cold/warm latency, and peak memory. Verify with `bun run test:onnx-browser` and the checked-in evaluation report.
- [ ] 1.4 Evaluate mask proposals on deterministic generated touching-pair, bridge, overlap, concavity, hole/ring, star, transparent-edge, scale/rotation, and single-object fixtures. Record instance-count accuracy, false splits/merges, IoU, boundary F1, and held-out seeds; define pass thresholds before tuning. Verify with `cargo test -p rusticker-onnx-assist --test synthetic_evaluation -- --nocapture`.

## 2. Optional local inference lifecycle

- [ ] 2.1 Reproduce the exact pair in a dedicated browser worker with ONNX Runtime Web CPU/WASM as the measured fallback; compare mask outputs with an independent reference and the predeclared synthetic quality thresholds. Keep the user-facing action disabled if quality or browser-budget gates fail.
- [ ] 2.2 Implement explicit, on-demand model/runtime loading with streaming size progress, cancellation, SHA-256 verification, versioned caching, quota handling, and graceful unavailable/offline fallback. No model/runtime request or cache write may contain user-derived data. Verify worker and cache behavior with `bun run test:web`.
- [ ] 2.3 Implement a disposable assistant worker, job/image/source identity checks, and cancellation on image replacement, source removal, overlay dismissal, or explicit cancel. Verify cancellation/stale-result behavior with `bun run test:web`.
- [ ] 2.4 Implement two-or-more region prompts and deterministic mask reconciliation against the original alpha mask. Preserve source RGB/alpha, reject unsafe masks, and return only language-neutral result codes across Rust/WASM boundaries. Verify with `cargo test -p rusticker-onnx-assist` and `bun run test:web`.

## 3. Editor, PWA, and verification

- [ ] 3.1 Add localized advanced controls, accessible point selection, download/progress/cancel feedback, and proposal review/accept/discard/undo while keeping the original sticker visible until acceptance. Add every message to `pt-BR`, `en`, and `es`; verify with `bun run check` and `bun run test:web`.
- [ ] 3.2 Ensure model files and optional runtime/WASM chunks are excluded from the initial PWA precache; verify explicit on-demand load, repeat use, cancellation, quota failure, and offline fallback. Verify with `bun run build` and a service-worker manifest assertion.
- [ ] 3.3 Update architecture documentation and Mermaid data-flow diagrams to distinguish standard detection from opt-in inference, model-only network requests, local image/prompt handling, and failure fallback. Verify links and run `git diff --check`.
- [ ] 3.4 Run `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `wasm-pack build onnx-assist --target web`, the project's WASM rebuild/reinstall command for any `core/` edits, and the web check, tests, lint, and production build. Run `bunx openspec validate opt-in-onnx-split-assistance --strict` and `bunx openspec validate --all --strict`.
