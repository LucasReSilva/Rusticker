## Research and gate record

- [x] Confirm the current production path and relevant OpenSpec contracts.
- [x] Identify a candidate model and record its upstream project, pinned ONNX artifact revision, size, declared license, input/output contract, and sources.
- [x] Define synthetic fixture classes, baseline, quality criteria, alpha/seam checks, and desktop/low-resource budgets.
- [x] Record the exact ONNX graph revision, verify its SHA-256 and size against public LFS metadata, and inventory its operators/domain/opset.
- [x] Run the exact graph with `tract` 0.23.8 natively and in a `wasm32-unknown-unknown` build invoked under Node's WebAssembly runtime.
- [ ] Verify the upstream export/quantization recipe and complete redistribution notices for a candidate small enough to meet the model budget.
- [ ] Run the exact graph in the app's browser worker; evaluate ONNX Runtime Web WASM only if a measured `tract` blocker appears in the browser.
- [ ] Generate deterministic fixtures; compare resize and candidate quality, alpha, and seams.
- [ ] Measure cold/warm latency and peak memory on documented desktop and low-resource devices; record output and commands.
- [ ] Extend the runnable harness with deterministic fixtures and conventional resizing; update the recommendation when all visual and device gates have evidence.
