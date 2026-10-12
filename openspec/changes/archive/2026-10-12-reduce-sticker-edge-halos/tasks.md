## 1. Baseline and fixtures

- [x] 1.1 Add deterministic opaque-edge fixtures with known foreground/background mixtures for green, blue, and achromatic selected backgrounds; record the current weighted RGB error and verify the fixtures with `cargo test -p rusticker-core`.
- [x] 1.2 Add preservation assertions for partial source alpha, opaque interiors, transparent surroundings, uncertain colors, and unchanged geometry; verify alpha bytes and bounding boxes with `cargo test -p rusticker-core`.

## 2. Conservative core correction

- [x] 2.1 Pass the selected background color into crop extraction and correct only eligible opaque boundary pixels with a same-component interior anchor and byte-rounding-consistent mixture; verify strict weighted edge-error reduction and all preservation assertions with `cargo test -p rusticker-core`.
- [x] 2.2 Run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`; rebuild and reinstall the WASM package with `bun run build:wasm` from `web/`.

## 3. Contract and integration

- [x] 3.1 Verify the rebuilt Rust/WASM path preserves alpha and reduces the known-background edge halo in a browser integration test; run `bun run check`, `bun run test`, and `bun run build` from `web/`.
- [x] 3.2 Update `ARCHITECTURE.md` with the conservative RGB correction, evidence limits, and distinction between geometric coverage and physical alpha; verify documentation/spec consistency with `bunx openspec validate --all --strict` and `git diff --check`.
