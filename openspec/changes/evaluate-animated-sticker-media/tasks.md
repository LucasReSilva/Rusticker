## 1. Scope and fixtures

- [x] 1.1 Inspect the current browser export boundary and document existing behavior; verify findings against `ARCHITECTURE.md`, `openspec/specs/sticker-export/spec.md`, and the relevant `web/src/lib/export/` code.
- [x] 1.2 Generate small synthetic fixtures for GIF, animated WebP, APNG, MP4, and WebM, including alpha, known frame timestamps, and an audio-bearing video case; verify fixture hashes and streams with reproducible local commands.

## 2. Browser and codec evaluation

- [x] 2.1 Probe native image, video, WebCodecs, canvas, and MediaCapabilities paths on available desktop browsers; record product, full version, OS, support query, real decode/encode outcomes, alpha, timestamps, and failures in the report.
- [ ] 2.2 Probe available real Android and iOS browsers/devices with the same fixtures and record exact versions; mark a platform unresolved when no physical target is available.
- [ ] 2.3 Compare at least one candidate local WASM codec build per applicable role for GIF/APNG/WebP frame processing and VP9 WebM processing; verify exact codecs, output profile, cancellation, offline use, compressed/expanded bytes, cold start, and peak memory, or document why a reproducible build is unavailable. A repository-local animated WebP Rust/WASM harness now builds offline after fetching its immutable Git pins and verifies synthetic output frames, timing, and alpha. Browser-worker execution remains inconclusive; no valid VP9/WebM alpha encode-plus-mux candidate, cancellation behavior, or peak-memory measurement was demonstrated. See the report's Rust-only candidate section and harness README.
- [ ] 2.4 Compare native and local-WASM outputs against fixtures for timing drift, alpha fidelity, dropped/duplicated frames, audio removal, duration, dimensions, codec/container, and encoded size using local media inspection commands.

## 3. Decision record and validation

- [x] 3.1 Document the evidence, source date, input/output support matrix, recommendation, limits, memory and file validation policy, reproducible commands, and unresolved tests in `docs/animated-media-evaluation.md`; verify every result maps to a recorded run or is explicitly marked untested.
- [x] 3.2 Link the report from the existing architecture or roadmap documentation and confirm the link resolves.
- [x] 3.3 Verify cited platform and standards sources, run `bunx openspec validate evaluate-animated-sticker-media --strict` and `git diff --check`, and confirm no production codec, runtime, dependency, or media behavior was added.

Tasks 2.2, 2.3, and 2.4 remain unchecked: no physical mobile browsers were available; the Rust/WASM image candidate does not cover the VP9/WebM output role and has no successful browser-worker run; and the native WebP baseline plus a failed fully transparent WebM candidate do not complete native-versus-WASM comparison or target importer validation.
