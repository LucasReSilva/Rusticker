## Research and gate record

- [x] Confirm the current production path and relevant OpenSpec contracts.
- [x] Identify a candidate model and record its upstream project, pinned ONNX artifact revision, size, declared license, input/output contract, and sources.
- [x] Define synthetic fixture classes, baseline, quality criteria, alpha/seam checks, and desktop/low-resource budgets.
- [x] Record the exact ONNX graph revision, verify its SHA-256 and size against public LFS metadata, and inventory its operators/domain/opset.
- [x] Run the exact graph with `tract` 0.23.8 natively and in a `wasm32-unknown-unknown` build invoked under Node's WebAssembly runtime.
- [x] Record Qualcomm's published W8A8 ONNX archive size and identify its artifact-specific license notice.
- [x] Record the pinned anime 6B ONNX file size, verify its downloaded hash, and probe native/WASM `tract` execution with a generated fixture.
- [x] Screen the pinned BrowserSnip anime 6B export; verify its hash and record the native `tract` shape-analysis blocker.
- [ ] Verify an upstream export/quantization recipe and complete redistribution notices for a candidate suitable for evaluation.
- [x] Run the pinned SkillSafe graph in an isolated CPU-WASM browser module worker and record its cold smoke result; this does not verify integration with the app's detector worker.
- [x] Evaluate ONNX Runtime Web WASM for the BrowserSnip graph after its measured native `tract` shape-analysis blocker.
- [ ] Generate deterministic fixtures; compare resize and candidate quality, alpha, and seams.
- [ ] Measure cold/warm latency and peak memory on documented desktop and low-resource devices; record output and commands.
- [ ] Extend the runnable harness with deterministic fixtures and conventional resizing; update the recommendation when all visual and device gates have evidence.
