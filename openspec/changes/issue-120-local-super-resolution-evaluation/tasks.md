## Research and gate record

- [x] Confirm the current production path and relevant OpenSpec contracts.
- [x] Identify a candidate model and record its upstream project, third-party graph provenance, claimed size, license, input/output contract, and sources.
- [x] Define synthetic fixture classes, baseline, quality criteria, alpha/seam checks, and desktop/low-resource budgets.
- [x] Record an honest interim go/no-go decision and list the evidence that is still missing.
- [ ] Pin the exact ONNX graph and independently verify its checksum, conversion recipe, license, and operator/domain/opset inventory.
- [ ] Run the exact graph in the pinned Rust/WASM runtime; only if blocked, measure the exact graph with ONNX Runtime Web WASM.
- [ ] Generate deterministic fixtures; compare resize and candidate quality, alpha, and seams.
- [ ] Measure cold/warm latency and peak memory on documented desktop and low-resource devices; record output and commands.
- [ ] Replace placeholder commands and interim decision with the complete reproducible result; update this checklist from the evidence.
