## 1. Diagnose with synthetic scenes

- [x] 1.1 Add generated RGBA scenes for transparent backgrounds with different hidden RGB values, partially transparent sticker pixels, and opaque blue, magenta, and gray backgrounds; verify the current outcomes with `cargo test -p rusticker-core --test synthetic`.
- [x] 1.2 Record which failures are caused by ignored input alpha and which are caused by the current HSV assumptions; keep all image data synthetic and in memory in `design.md`.

## 2. Define the supported contract

- [x] 2.1 Update the `sticker-detection` OpenSpec requirements for alpha-zero pixels, partial source alpha, and exact-color matching at zero tolerance while preserving the green-screen and nonzero-tolerance contracts.
- [x] 2.2 Confirm uniform backgrounds of any RGB color at zero tolerance are in scope, and confirm non-uniform backgrounds remain out of scope for #53.

## 3. Verify and hand off

- [x] 3.1 Run `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`; rebuild and reinstall WASM with `bun run build:wasm` from `web/` after changes under `core/`.
- [x] 3.2 Run `openspec validate diagnose-transparent-background-splitting --strict` and prepare the diagnostic findings and support boundary for issue #53.
