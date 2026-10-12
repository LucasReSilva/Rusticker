## 1. Build deterministic evaluation fixtures

- [x] 1.1 Add generated masks for touching/overlapping, close-separated, noisy, and ambiguous single-object shapes; verify fixture dimensions and expected instance masks through a focused Rust integration test.
- [x] 1.2 Record baseline 8-connected component counts for every fixture family; verify with `cargo test -p rusticker-core --test watershed_evaluation`.

## 2. Evaluate a test-only watershed candidate

- [x] 2.1 Add padded-box squared-distance, regional-maximum marker, and deterministic priority-flood helpers confined to `core/tests/`; verify repeated runs produce identical labels.
- [x] 2.2 Compare watershed partitions with fixture ground truth using region count, matched IoU, missed-split, false-split, and foreground-coverage metrics; verify expected results in `cargo test -p rusticker-core --test watershed_evaluation`.
- [x] 2.3 Run `cargo fmt --all -- --check`, `cargo clippy -- -D warnings`, and `cargo test` to ensure the research harness introduces no production regressions.
- [x] 2.4 Rebuild and reinstall WebAssembly with `bun run build:wasm` from `web/` after changes under `core/`; verify the command succeeds even though runtime code is unchanged.

## 3. Document the decision

- [x] 3.1 Record results by fixture family, memory/runtime implications, ambiguity limits, and a clear go/no-go recommendation with primary references; verify `openspec validate evaluate-watershed-separation --strict` and review the final diff for private data.
