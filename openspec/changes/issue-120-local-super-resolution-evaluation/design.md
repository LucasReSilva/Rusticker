## Evaluation design

### Candidate path

The primary candidate is Qualcomm's pre-exported Real-ESRGAN-x4plus ONNX model, pinned at public revision `f75f074d9e6b1adfb6da9e2afce7308a986ec88d`. The model card states BSD-3-Clause, input resolution 128 x 128, 16.7M parameters, 63.9 MB float weights, and 16.7 MB w8a8 weights; the linked float ONNX export lists ONNX Runtime 1.27.1 as its validated runtime. The source architecture and weights originate in the Real-ESRGAN project. The pinned file's LFS metadata reports 67,123,162 bytes and SHA-256 `4e1ae0e47f80d9f4aa2a317c24fde2cb3e49a5381eed6e1d509b4001a4b97ad2`; the independently downloaded bytes matched both values. Its 63.98 MiB float artifact fails the 20 MiB model gate. The model card's 16.7 MB w8a8 entry is not present as an ONNX file at this pinned revision and has not been tested. Qualcomm's published timing and memory figures are for Qualcomm accelerators and do not predict browser CPU/WASM performance.

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

**No-go for production integration; runtime compatibility probe passed, product gates did not.** The pinned FP32 graph exceeds the model-size budget. `tract` 0.23.8 parsed, optimized, and ran its exact bytes natively and in a `wasm32-unknown-unknown` build invoked under Node's WebAssembly runtime. The graph is opset 17 with one `[1,3,128,128]` input, 1,094 standard-domain nodes, and no custom domains: Conv (351), LeakyRelu (279), Concat (276), Add (93), Mul (92), Resize (2), and Clip (1). Both runs returned a `[1,3,512,512]` F32 output for a zero tensor. Native inference took 11,334 ms after load/optimization; the WASM call took 87,621 ms including graph load and optimization. The measured generated WASM was 86,571,967 bytes raw, 65,740,805 bytes gzip level 9, and 64,663,045 bytes Brotli quality 5, with the model embedded. These are compatibility probes, not image-quality results or comparable cold/warm performance measurements. Node is a WASM host, not the app's browser worker. The temporary artifact was downloaded with a TLS-validating Node HTTPS client after the Git-for-Windows curl client failed with Schannel `SEC_E_NO_CREDENTIALS`; the hash matched the model repository's LFS metadata. Synthetic fixture comparisons, alpha/seam checks, browser worker execution, warm/cold browser timing, and low-resource device memory/latency remain unmeasured. Do not add a production dependency. Revisit only with a smaller licensed export and the missing visual/browser measurements.

### Reproduction record

The checked-in evaluation harness records the acquisition, hash verification, native run, wasm32 build, and Node WASM invocation. See `tools/issue-120-onnx-evaluation/README.md` for commands. On the evaluation host, Cargo needed a temporary uncommitted resolver stub for the disabled optional `tract-transformers` dependency because crates.io was unreachable and the local index lacked its metadata; that stub was removed and was not used to execute the graph. The current harness uses a zero tensor only; quality and device measurements require additional generated fixture and browser harness work.

Model acquisition, operator inventory, and `tract` execution commands have been validated in the checked-in evaluation harness. Fixture generation, interpolation comparison, browser-worker invocation, warm inference, and target-device memory sampling remain future harness tasks.

### Sources

- Qualcomm Real-ESRGAN-x4plus model card, fixed revision, downloadable ONNX variants, license, model dimensions, sizes, and Qualcomm-device measurements: https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/tree/f75f074d9e6b1adfb6da9e2afce7308a986ec88d
- Qualcomm model repository file metadata, including the pinned ONNX LFS SHA-256 and byte length: https://huggingface.co/api/models/qualcomm/Real-ESRGAN-x4plus/tree/f75f074d9e6b1adfb6da9e2afce7308a986ec88d?recursive=true&expand=true
- Real-ESRGAN upstream repository, source architecture, anime model, and repository license: https://github.com/xinntao/Real-ESRGAN
- SkillSafe AI Real-ESRGAN anime 6B browser ONNX model card (third-party lead only; not independently verified): https://huggingface.co/skillsafe-ai/realesrgan-x4plus-anime-6b
- ONNX Runtime Web execution providers and WASM operator support: https://onnxruntime.ai/docs/tutorials/web/
- ONNX Runtime Web deployment assets and bundling guidance: https://onnxruntime.ai/docs/tutorials/web/deploy.html
- Tract project and runtime support surface: https://github.com/sonos/tract
