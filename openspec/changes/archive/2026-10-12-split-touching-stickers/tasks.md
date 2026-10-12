## 1. Rust/WASM proposal operation

- [x] 1.1 Add a bounded deterministic proposal operation for one 512x512 alpha mask and test connected, overlapping-lobe, single-shape, ring, edge, noise, and ambiguous masks with `cargo test -p rusticker-core`.
- [x] 1.2 Expose proposal images and the empty no-proposal result through WASM without changing `detect`; verify accessors and invalid indices with `cargo test -p rusticker-core`.
- [x] 1.3 Run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`; rebuild/reinstall with `bun run build:wasm` in `web/`.

## 2. Worker and editor review flow

- [x] 2.1 Extend the worker protocol and detector API for explicit split requests; verify proposal mapping and WASM-owned buffer copies with a real-WASM engine integration test and `bun run check`.
- [x] 2.2 Add state for proposal preview, accept, discard, and undo while keeping original sticker/export state intact until acceptance; verify transitions in editor state tests.
- [x] 2.3 Add accessible proposal preview/actions to the sticker grid and localized text in every locale; verify localized interaction and keyboard focus behavior in component tests.
- [x] 2.4 Verify no-proposal fallback leaves the original unchanged and displays localized status; run `bun run check`, `bun run test`, and `bun run lint` in `web/`.

## 3. Integration verification

- [x] 3.1 Verify default detection outputs and bundled/private sample counts remain unchanged and accepted proposals flow into export; run Rust and web integration checks.
- [x] 3.2 Validate OpenSpec artifacts and confirm no generated WASM/package artifacts or private image data are committed.
