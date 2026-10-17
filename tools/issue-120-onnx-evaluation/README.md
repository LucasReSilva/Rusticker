# Issue 120 ONNX evaluation harness

This isolated harness evaluates fixed-revision Qualcomm Real-ESRGAN-x4plus and SkillSafe Real-ESRGAN anime 6B float ONNX exports with `tract` 0.23.8. It does not add a runtime dependency to the app or ship model bytes.

Run from the repository root in PowerShell:

```powershell
bun tools/issue-120-onnx-evaluation/fetch-model.cjs
$model = Join-Path $env:TEMP 'rusticker-issue120-x4plus.onnx'
cargo run --release --manifest-path tools/issue-120-onnx-evaluation/Cargo.toml -- $model
$env:ISSUE120_MODEL_PATH = $model
cargo build --release --target wasm32-unknown-unknown --manifest-path tools/issue-120-onnx-evaluation/Cargo.toml
bun tools/issue-120-onnx-evaluation/run-wasm.cjs
Remove-Item -LiteralPath $model
```

The fetch script pins the Qualcomm model card revision and verifies its public LFS SHA-256 and byte length before returning the temp path. `ISSUE120_MODEL_PATH` is used only at WASM build time to embed the graph in this evaluation binary. The runner supplies the Web Crypto import required by `tract`'s `getrandom-js` feature.

The recorded local build needed a temporary, uncommitted Cargo resolver stub for `tract-transformers`, an optional dependency disabled by this harness, because the host could not reach crates.io and its cache lacked that package's index metadata. The stub was removed and is not part of the harness or graph execution. The actual `tract-onnx` 0.23.8 implementation parsed and ran the pinned graph. Re-run the commands above with normal crates.io access to verify a clean dependency resolution.

## Recorded result

- ONNX opset 17; one input `[1, 3, 128, 128]`; 1,094 nodes using Conv (351), LeakyRelu (279), Concat (276), Add (93), Mul (92), Resize (2), and Clip (1).
- Artifact: 67,123,162 bytes; SHA-256 `4e1ae0e47f80d9f4aa2a317c24fde2cb3e49a5381eed6e1d509b4001a4b97ad2`.
- Native `tract` 0.23.8 loaded and ran a zero-valued input to `[1, 3, 512, 512]` F32 output. One run measured 11,334 ms for inference after model load and optimization.
- `wasm32-unknown-unknown` `tract` build loaded and ran the same graph under Node's WebAssembly runtime. One call returned 0 and took 87,621 ms, including model loading and optimization. The generated WASM was 86,571,967 bytes raw, 65,740,805 bytes gzip level 9, and 64,663,045 bytes Brotli quality 5; these figures include the embedded graph.
- These are runtime compatibility probes on one zero tensor, not image-quality comparisons, warm/cold browser benchmarks, or low-resource-device measurements. Browser-worker execution, synthetic artwork/text/line-art/alpha/photo comparisons, alpha-edge/seam review, and desktop/mobile memory measurements remain open.

## W8A8 candidate screen (2026-10-17)

Qualcomm's v0.34.0 repository revision `d006168348af28d9cb65234138d6886667bd794a` publishes `Real-ESRGAN-x4plus_w8a8.onnx.zip` with SHA-256 `554abcf0f7bf82ed7c4ce2a5a34de8647b76c67eb5acdaea998facb0eef787e` and size 27,825,664 bytes (26.54 MiB). The delivery archive alone exceeds the 20 MiB model gate; Qualcomm's 16.7 MB model-card figure is not the downloadable archive size. The repository identifies its deployment-file license separately in `DEPLOYMENT_MODEL_LICENSE.pdf`; the model card's BSD-3-Clause label covers the original model, so it is insufficient to clear redistribution of the compiled ONNX artifact. The exact quantized graph, archive contents, and deployment-license terms were not evaluated because this candidate fails the size gate and has an unresolved artifact-specific license review.

No browser worker run was added. The existing Node probe executes the standalone `tract` WASM evaluator with the Qualcomm float graph embedded; this is Node-hosted WebAssembly, not the app's browser worker. A browser module-worker probe is technically possible, but it would not turn the oversized float artifact or its 64.7 MiB Brotli evaluator binary into a candidate within the documented budgets. It would also not establish mobile-browser performance. The W8A8 graph has not been loaded, and no browser/device compatibility or performance conclusion is claimed. Synthetic fixture quality, alpha, and seam comparisons remain unmeasured for both Qualcomm artifacts.

Sources: [Qualcomm W8A8 repository revision](https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/tree/d006168348af28d9cb65234138d6886667bd794a), [revision change record with archive size/hash](https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/commit/d006168348af28d9cb65234138d6886667bd794a), [deployment model license notice](https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/blob/d006168348af28d9cb65234138d6886667bd794a/DEPLOYMENT_MODEL_LICENSE.pdf).

## Anime 6B candidate screen (2026-10-17)

SkillSafe's Real-ESRGAN x4plus anime 6B FP32 ONNX file at revision `c001be50fae1c7a2bae8b2b4dec5e6fcbdbcca96` is 17,939,975 bytes (17.11 MiB), SHA-256 `9a029dae374b2cd4c3eb2dbbed857e22e6d785687c767aa12828e7356b9fb378`. The downloaded bytes matched its public LFS metadata, so this file clears the 20 MiB model-size gate. Its manifest identifies the upstream v0.2.2.4 weights (17,938,799 bytes, claimed SHA-256 `f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da`), embeds the export recipe content, and specifies a dynamic RGB F32 NCHW input with 4x RGB output at opset 17. The model card and upstream repository declare BSD-3-Clause for the weights and architecture. Redistributing those upstream materials requires carrying the BSD notice in source or distribution materials, and the copyright holder's name cannot be used for endorsement. The model card says its recipe and card have the converter repository's license, but its linked converter repository returned GitHub HTTP 404 on inspection. The export implementation and a full independent byte reproduction are therefore unavailable; the candidate has not cleared the evaluation's provenance and redistribution-notice gate. This finding does not assert that ONNX distribution is prohibited.

Run the same isolated `tract` 0.23.8 probe on this candidate:

```powershell
bun tools/issue-120-onnx-evaluation/fetch-model.cjs anime6b
$model = Join-Path $env:TEMP 'rusticker-issue120-anime6b.onnx'
cargo run --release --manifest-path tools/issue-120-onnx-evaluation/Cargo.toml -- $model
$env:ISSUE120_MODEL_PATH = $model
cargo build --release --target wasm32-unknown-unknown --manifest-path tools/issue-120-onnx-evaluation/Cargo.toml
bun tools/issue-120-onnx-evaluation/run-wasm.cjs
bun tools/issue-120-onnx-evaluation/measure-size.cjs $model
Remove-Item -LiteralPath $model
```

The harness fixes the dynamic shape to `[1, 3, 64, 64]` and generates flat gray regions with a bright diagonal line. Native `tract` returned finite F32 `[1, 3, 256, 256]` output in 810 ms of inference after load/optimization; sample output ranged from -0.0111 to 1.1055, so a display path would need an explicit clipping policy. The WASM build ran the same graph under Bun's WebAssembly runtime and returned exit code zero in 8,954 ms for one call including model load, optimization, and inference. The generated WASM was 37,415,621 bytes raw and 19,233,441 bytes at Brotli quality 5 with the model embedded; the standalone ONNX file was 16,596,135 bytes at Brotli quality 5. The 2,637,306-byte difference is an indicative packaged-runtime increment, not a separate-runtime measurement. These are single-host compatibility and payload observations, not browser-worker timing, cold/warm benchmarks, or image-quality evidence.

The graph's input has three channels and no alpha input. An alpha reconstruction strategy and tile overlap are still needed before edge and seam quality can be assessed. The generated fixture confirms that the graph runs on nonzero line art; it does not establish visual improvement over conventional resizing. Because byte reproducibility and complete conversion-license notices have not been verified, browser/device benchmarking and a five-class quality study remain gated. The production recommendation remains **no-go**.

Sources: [pinned SkillSafe model card](https://huggingface.co/skillsafe-ai/realesrgan-x4plus-anime-6b/tree/c001be50fae1c7a2bae8b2b4dec5e6fcbdbcca96), [public LFS metadata](https://huggingface.co/api/models/skillsafe-ai/realesrgan-x4plus-anime-6b/tree/c001be50fae1c7a2bae8b2b4dec5e6fcbdbcca96?recursive=true&expand=true), [embedded recipe and provenance manifest](https://huggingface.co/skillsafe-ai/realesrgan-x4plus-anime-6b/blob/c001be50fae1c7a2bae8b2b4dec5e6fcbdbcca96/manifest.json), [upstream Real-ESRGAN BSD-3-Clause license](https://github.com/xinntao/Real-ESRGAN/blob/a4abfb2979a7bbff3f69f58f58ae324608821e27/LICENSE), [upstream anime 6B release](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.2.4), [converter source URL from the model card](https://github.com/skillsafe-admin/skillsafe.ai-website/tree/main/models).
