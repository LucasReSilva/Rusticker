## Evaluation design

### Candidate path

The primary candidate is Qualcomm's pre-exported Real-ESRGAN-x4plus ONNX model, available as a fixed-revision public artifact (`f75f074d9e6b1adfb6da9e2afce7308a986ec88d`). Qualcomm's model card reports BSD-3-Clause, input resolution 128×128, 16.7M parameters, 63.9 MB float weights, and 16.7 MB w8a8 weights; the linked ONNX export reports ONNX Runtime 1.27.1 as its validated runtime. The source architecture and weights originate in the Real-ESRGAN project. The float export already exceeds this evaluation's 20 MiB compressed model budget by a wide margin; the quantized export remains a candidate but its graph bytes, hash, quantization operators, and redistribution notices have not been verified locally. Qualcomm's published timing and memory figures are for Qualcomm accelerators and do not predict browser CPU/WASM performance.

An additional research lead is Real-ESRGAN x4plus anime 6B, which the upstream project identifies for anime illustrations. A third-party browser ONNX conversion claims an opset 17 graph and 17.11 MB FP32 size, but it is not the first candidate because it is not an upstream export and its conversion has not been independently reproduced.

The first execution target is the exact graph in Rust/WASM. Inspect and record every ONNX operator/domain/opset in the pinned graph, then attempt loading and inference with the pinned `tract` version. A failed load or unsupported operator must include the minimal reproducer and error. Only a measured blocker permits evaluating ONNX Runtime Web's WASM backend as a fallback; do not substitute a different graph and call it the same experiment.

### Fixtures and baseline

Generate deterministic, non-private fixtures with known high-resolution references: flat-color illustration and curves, small text/glyph strokes, thin line art, a transparent foreground with antialiased alpha edges, and a photographic texture. Degrade each fixture using a documented downsample kernel and scale. Compare a conventional high-quality resize at the same target dimensions with every candidate. Record paired crops and objective measures (PSNR/SSIM where a reference exists) plus a blinded visual review for invented detail, ringing, line breaks, text legibility, alpha fringes, and crop/tile seams.

Preserve alpha by processing color and alpha explicitly; record whether the model accepts alpha (it commonly accepts RGB only), the alpha reconstruction method, and edge contamination. Exercise both whole-image and overlapped tiled inference at the same scale. Measure output dimensions and peak memory as well as visual quality.

### Gates

Do not recommend integration unless all gates pass:

| Gate | Pass condition |
| --- | --- |
| Artifact and license | Exact graph, source weights, conversion recipe, hashes, operator list, and redistribution terms are pinned and independently reproducible. |
| Rust/WASM compatibility | The exact graph loads and produces finite, correctly shaped output in the pinned Rust/WASM runtime. |
| Quality | No critical regression on any fixture; blinded reviewers prefer the model on at least 4/5 fixture classes; quantitative metrics do not regress by more than 0.5 dB PSNR or 0.01 SSIM against resize. |
| Alpha and seams | Transparent-edge color bleed is not visible at 100% review, and tiled output has no visible seams on all fixtures. |
| Artifact budget | Model is at most 20 MiB and incremental WASM/runtime payload at most 5 MiB compressed. |
| Latency | On a documented desktop, cold initialization plus one 512×512 input is at most 2 s and warm inference at most 1 s; on a documented low-resource device, cold is at most 8 s and warm at most 4 s. |
| Memory | Peak additional memory is at most 256 MiB desktop and 128 MiB low-resource, including tile buffers and runtime. |

If and only if the Rust/WASM graph fails compatibility, measure the same exact graph through ONNX Runtime Web's WASM backend. Its runtime bytes count against the 5 MiB budget. A WebGPU result is not evidence for the required CPU/WASM fallback.

### Current decision

**Conditional no-go for production integration; evaluation is blocked before runtime testing.** Qualcomm's public model card identifies a licensed float and quantized ONNX export at a fixed artifact revision. The float export exceeds the predeclared model budget; the smaller quantized export needs byte-level and graph inspection. This environment could not acquire the graph: `curl.exe -I https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/resolve/f75f074d9e6b1adfb6da9e2afce7308a986ec88d/Real-ESRGAN-x4plus.onnx` failed before HTTP transfer with Schannel `SEC_E_NO_CREDENTIALS`. Therefore no graph checksum/operator inventory or Rust/WASM inference was attempted, and no technical incompatibility is inferred. Synthetic quality comparisons, alpha/seam checks, and desktop/low-resource browser measurements are also unrun. Resume with the pinned quantized artifact through an approved acquisition route; record all missing measurements before a production decision.

### Reproduction record

At this stage the recorded checks are source inspection only. Qualcomm's model card is pinned to artifact revision `f75f074d9e6b1adfb6da9e2afce7308a986ec88d`; the required binary hash must be calculated after acquisition. The following commands define the next executable checks once the graph is available locally:

```text
sha256sum model.onnx
python tools/list_onnx_operators.py model.onnx
cargo run --release -p onnx-evaluation -- --model model.onnx --fixtures generated-fixtures/
```

These are evaluation placeholders, not commands validated by this repository. A future report must replace them with checked-in, runnable harness commands and capture runtime/toolchain/device versions.

### Sources

- Qualcomm Real-ESRGAN-x4plus model card, fixed revision, downloadable ONNX variants, license, model dimensions, sizes, and Qualcomm-device measurements: https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/tree/f75f074d9e6b1adfb6da9e2afce7308a986ec88d
- Real-ESRGAN upstream repository, source architecture, anime model, and repository license: https://github.com/xinntao/Real-ESRGAN
- SkillSafe AI Real-ESRGAN anime 6B browser ONNX model card (third-party lead only; not independently verified): https://huggingface.co/skillsafe-ai/realesrgan-x4plus-anime-6b
- ONNX Runtime Web execution providers and WASM operator support: https://onnxruntime.ai/docs/tutorials/web/
- ONNX Runtime Web deployment assets and bundling guidance: https://onnxruntime.ai/docs/tutorials/web/deploy.html
- Tract project and runtime support surface: https://github.com/sonos/tract
