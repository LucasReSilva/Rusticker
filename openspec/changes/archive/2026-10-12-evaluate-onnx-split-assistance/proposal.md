## Why

Rusticker wants optional model-assisted splitting for ambiguous connected stickers while keeping the existing deterministic Rust/WASM detector as the first stage. The runtime and model ecosystem has changed, and choosing a runtime before checking workload fit, licensing, operator compatibility, download cost, and low-resource performance would create avoidable product and privacy risks.

## What Changes

- Evaluate the target task and current split behavior using only generated synthetic sticker fixtures with ground-truth instance masks.
- Compare Rust/WASM ONNX runtimes first, then document a JavaScript/WebAssembly fallback only if the Rust path has a concrete blocker.
- Compare candidate model families for arbitrary sticker instances, promptability, model/checkpoint licenses, export and operator support, download size, startup/inference time, peak memory, offline operation, and low-resource devices.
- Publish a reproducible technical decision record with sources, measured evidence, limitations, and a recommendation for the follow-up implementation issue.
- Keep image inference off-device out of scope: no upload, server inference, or telemetry containing image data.
- Do not add an ONNX runtime, model weights, inference path, UI, or runtime dependency in this evaluation change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records feasibility and implementation gates; it does not change product behavior. `skip_specs: true` is set for this documentation and research change.

## Impact

- Documentation: add an ONNX feasibility report and link it from `ARCHITECTURE.md` and the roadmap section in `README.md`.
- Evaluation: use the existing Rust synthetic split fixtures and add only generated fixtures or evaluation scripts needed to make comparisons reproducible.
- No production changes to `core/`, `web/`, the WASM interface, dependencies, or model assets.
