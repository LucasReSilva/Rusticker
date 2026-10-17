# Rust animated WebP WASM probe

This isolated evaluation harness checks a pure-Rust animated WebP encoder with synthetic pixels. It does not change Rusticker product code, accept input files, or perform network requests during a run.

## Pinned source

The probe uses `oxideav-webp` version `0.3.1` from immutable upstream commit `b8ab09d8e98af74aabaa30dacc8b1ba9076410ea`, plus its `oxideav-vp8` `0.2.7` dependency at commit `fb852a4896dd48f1d5d1a05c471ada8a0208b029`. `Cargo.lock` records both Git source revisions. Version 0.3.1 is present in that upstream source tree; the probe pins Git source because the selected revision is not a crates.io release and therefore has no crates.io package checksum. For an independent source-tree integrity check, `git archive --format=tar --prefix=oxideav-webp-0.3.1/ b8ab09d8e98af74aabaa30dacc8b1ba9076410ea` has SHA-256 `C8B052074D1060FCDD2E0CD3ABB2AACC95ADBFA11DBEA9FCDBDEC4F19DA74FE6`; the VP8 dependency's corresponding archive hash is `DF45EE2DF3695FB5C9A22FCEA2FE70E0D7156CE82527DF05C5515B3C6706AD3A`. The commit IDs are the Cargo source pins, and the archive hashes identify the checked source trees. Both projects are MIT-licensed.

## Prerequisites

- Rust and Cargo 1.80 or later, with `wasm32-unknown-unknown` installed.
- Bun 1.3 or later.
- A one-time Git fetch for the two pinned source revisions. No user media or sample asset is downloaded.

From the repository root, fetch the sources once:

```powershell
$env:CARGO_NET_GIT_FETCH_WITH_CLI = 'true'
$env:GIT_CONFIG_COUNT = '1'
$env:GIT_CONFIG_KEY_0 = 'http.sslBackend'
$env:GIT_CONFIG_VALUE_0 = 'openssl'
cargo fetch --locked --manifest-path tools/animated-media-evaluation/rust-webp-wasm-probe/Cargo.toml
```

Then build and run offline. The script creates its WebP output under its ignored `target/` directory and uses no input files:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/animated-media-evaluation/rust-webp-wasm-probe/run.ps1
```

The script builds the Rust `cdylib` for `wasm32-unknown-unknown`, instantiates it in Bun, creates ten 32 × 32 RGBA frames in memory, encodes them as a looping lossless animated WebP, then runs the same pinned Rust decoder on the resulting file. It asserts ten frames, 100 ms per frame, 32 × 32 dimensions, transparent top-left pixels, and an opaque red pixel inside each moving bar. It also checks the known output SHA-256 and prints the hash on success.

## Observed run

On Windows 10 Pro with `rustc 1.98.1`, Cargo 1.98.1, and Bun 1.3.14, the offline build and all ten decoded-frame assertions passed. The module measured 480,022 bytes (127,783 bytes gzip) in the recorded clean-cache build; it produced a 586-byte animated WebP with SHA-256 `53E9C9C2E64138C1743E70B02DB09BBA1D2A07E49D2E4A1BA231D0BEAF24E2EA`. Across repeated runs, Bun measured 4.1–5.3 ms module instantiation and 490–694 ms encoding. The WASM linear memory grew from 1,114,112 bytes after instantiation to 2,228,224 bytes after the encode in the latest run; this is not a process peak-memory measurement. Timings and module byte counts vary with host, toolchain, and build path; these tiny-fixture measurements do not predict 512 × 512 or mobile performance.

This probe is a feasibility and local-format test. It does not prove browser Worker execution, mobile support, cancellation, peak memory, WhatsApp importer acceptance, VP9 encoding, or WebM muxing.
