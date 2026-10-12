## 1. Workload and runtime feasibility

- [x] 1.1 Inventory the current bounded split pipeline and synthetic fixture coverage; record a reproducible baseline with `cargo test -p rusticker-core --test watershed_evaluation -- --nocapture`.
- [x] 1.2 Screen pure-Rust `tract`, `ort-web`, and ONNX Runtime Web against official browser/WASM documentation and record maintenance, licensing, support boundaries, assets, and the exact-graph compatibility gaps in `docs/onnx-split-evaluation.md`; defer execution of a selected exported graph to issue #55 because no complete candidate graph is supplied by the upstream MobileSAM export.

## 2. Model and benchmark decision

- [x] 2.1 Compare promptable and automatic instance-segmentation candidates by task fit, checkpoint/export availability, code and weight license status, known model bytes, and public inference evidence; cite primary sources in `docs/onnx-split-evaluation.md`.
- [x] 2.2 Evaluate the existing baseline and test-only watershed candidate on the 16 generated masks; report their instance-count, false-split/merge, and IoU results, and explicitly mark ONNX model metrics unavailable because no complete model graph was executed. Verify with `cargo test -p rusticker-core --test watershed_evaluation -- --nocapture`.
- [x] 2.3 Publish the `tract`-first runtime recommendation, promptable-only MobileSAM shortlist, opt-in trigger/fallback, privacy/offline constraints, and exact-graph go/no-go gates for issue #55; link the report from `ARCHITECTURE.md` and `README.md`.

## 3. Validation

- [x] 3.1 Verify cited primary-source links, run `bunx openspec validate evaluate-onnx-split-assistance --strict`, `bunx openspec validate --all --strict`, and `git diff --check`.
