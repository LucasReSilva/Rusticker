## 1. Implement core classification and alpha handling

- [x] 1.1 Ignore alpha-zero pixels while building the foreground mask; verify transparent hidden-RGB scenes remain separated with `cargo test -p rusticker-core --test synthetic`.
- [x] 1.2 Multiply source alpha by 3x3 component coverage during extraction; verify alpha-zero stays zero, alpha-128 interiors stay 128, and opaque baseline tests pass with `cargo test -p rusticker-core`.
- [x] 1.3 Use exact RGB matching at tolerance zero while preserving nonzero HSV thresholds; verify gray/red and chromatic background cases with Rust unit and synthetic tests.

## 2. Verify compatibility and WASM integration

- [x] 2.1 Run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`.
- [x] 2.2 Rebuild and reinstall the WebAssembly package with `bun run build:wasm` from `web/` after changes under `core/`; verify the command completes successfully.
- [x] 2.3 Run `openspec validate support-transparent-background-detection --strict` and review the diff for privacy and scope.

## 3. Keep technical documentation aligned

- [x] 3.1 Update the core pipeline summary and architecture diagram to describe alpha-zero masking, exact RGB matching at zero tolerance, source-alpha coverage, and remaining non-uniform-background limits.
