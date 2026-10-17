# Rust animated WebP WASM probe

This isolated evaluation harness checks a pure-Rust animated WebP encoder with synthetic pixels. It does not change Rusticker product code or accept input files. The Bun runner uses no network; the browser runner serves only a blank loopback page before simulating offline execution.

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

## Browser Worker probe

After the offline build above, run the browser harness from the repository root with Bun and an installed Chrome on Windows:

```powershell
bun tools/animated-media-evaluation/rust-webp-wasm-probe/run-browser.mjs
cargo run --locked --offline --release --manifest-path tools/animated-media-evaluation/rust-webp-wasm-probe/Cargo.toml --bin verify-output -- tools/animated-media-evaluation/rust-webp-wasm-probe/target/browser-output.webp
```

The optional `PROBE_BROWSER_EXECUTABLE` environment variable selects another Chromium executable. The default is `C:/Program Files/Google/Chrome/Application/chrome.exe`. The harness creates a dedicated temporary profile, connects over loopback CDP using Bun's native WebSocket, and closes that browser after the run. It needs no Playwright package, browser download, external page, or codec download. It writes only synthetic `target/browser-output.webp`, which is Git-ignored.

The harness waits for its blank loopback page to load, then uses CDP's offline network emulation before creating Blob Workers and supplying the already-local WASM bytes. It verifies instantiation and encoding, terminates a second Worker after its encoding-start message plus 25 ms, observes no output for 250 ms, then verifies identical output from a replacement Worker. Synchronous WASM cannot receive a cancellation message during encoding; this tests hard termination only. The printed `terminateCallMs` measures the JavaScript call, not memory reclamation or process teardown latency.

Chrome `155.0.8059.79` on Windows 10 passed on 2026-10-17: 2.1 ms instantiation, 472 ms encoding, 0.1 ms `terminate()` call, linear memory 1,114,112 to 2,228,224 bytes, and the same 586-byte file/hash as Bun. Native Chrome `ImageDecoder` independently checked all ten frames, every 100 ms timestamp/duration, and all 10,240 pixels for alpha and bar color; the pinned Rust decoder also passed on that browser-generated file. These are individual tiny-fixture measurements, not representative benchmarks. A follow-up Edge launch exited before exposing its CDP endpoint; no Edge Worker result is claimed. Playwright's Bun/Windows debugging-pipe and WebSocket transports timed out; those harness failures are not evidence against the codec.

This probe demonstrates a synthetic animated-WebP encode in a desktop browser Worker. It does not provide GIF/APNG/video input decoding, a production browser-to-encoder interface, 512 × 512 performance, real Android/iOS validation, peak memory, graceful cancellation, app/PWA offline installation, WhatsApp importer acceptance, VP9 encoding, or WebM muxing.
