# ONNX Split Assistance Feasibility

**Status:** feasibility recommendation; no ONNX model is shipped or executed by Rusticker.  
**Issue:** [#54](https://github.com/LucasReSilva/Rusticker/issues/54)  
**Reviewed:** 2026-10-12

## Recommendation

Keep the current deterministic Rust/WASM detector as the first stage. For an opt-in advanced action, prototype a promptable mask model, with MobileSAM as the first model candidate and the pure-Rust `tract` runtime as the first ONNX runtime candidate. Preserve the existing split proposal and require the user to review and accept any assisted result. If the exact MobileSAM image-encoder and prompt-decoder graphs fail `tract` operator or browser tests, compare the same graphs with ONNX Runtime Web (direct TypeScript integration is the fallback; `ort-web` is an alternative Rust-facing adapter, not a pure-Rust runtime).

Do not implement an automatic ONNX splitter from a generic COCO checkpoint. Stickers are arbitrary shapes and classes; a model that segments people, animals, or common objects does not establish instance separation quality for unknown sticker art. An automatic model should be trained or fine-tuned for sticker-instance masks and pass a separate synthetic benchmark.

This is a **runtime/model shortlist, not a ship decision**. No ONNX graph was run in this repository, so sticker-specific model quality, exact operator compatibility, browser latency, peak memory, and the shipped runtime bundle size remain unmeasured. Issue #55 must begin with that proof of concept and retain a no-model fallback.

## Runtime comparison

| Candidate | Fit for Rusticker | Compatibility and maintenance | Decision |
| --- | --- | --- | --- |
| [`tract`](https://github.com/sonos/tract) | ONNX inference is implemented in Rust and upstream documents browser use through WebAssembly. | It has an actively maintained public `tract` facade, browser benchmark example, and an operator registry. Compatibility is graph-specific: confirm the exact MobileSAM opset, operators, attributes, shapes, and data types. The upstream project is MIT/Apache-2.0; audit dependency notices and the exact pinned release. | **First proof of concept**, CPU/WASM. Measure its actual WASM and memory cost; upstream support alone is not a benchmark. |
| [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) | Mature browser runtime with WebAssembly CPU and optional WebGPU/WebNN providers, but the inference API and orchestration are JavaScript/TypeScript. | Official docs report broad ONNX operator support on WASM and browser coverage, with smaller operator subsets on accelerator providers. Deployment requires JS, WASM binaries, model graph(s), worker setup, and optional external data. Assets may be cached on demand; do not add model bytes to the initial precache without measuring. Runtime is MIT-licensed. | **Compatibility fallback** only if `tract` has a concrete model/operator/performance blocker. Prefer WASM CPU first for broad browser support. |
| [`ort` with `ort-web`](https://github.com/pykeio/ort/tree/main/backends/web) | Rust-facing API and a wasm-pack browser example; the backend calls ONNX Runtime Web's JavaScript/WASM implementation. | Adds a Rust-to-JS integration layer and still ships the ORT Web runtime. It is not inference implemented entirely in Rust. Verify the pinned backend and browser APIs before choosing it. | Consider only if the Rust-facing API materially simplifies Rusticker's worker boundary over using ORT Web directly. |
| [`Burn ONNX`](https://github.com/tracel-ai/burn-onnx) | Converts a fixed ONNX graph to Rust code during build; this is not a runtime for loading a downloaded ONNX graph. | Operator support is model-specific and its supported-operator table must be checked against the exported graph. Could reduce runtime parsing needs but changes the model update/build workflow. | Not the first fit for an optional downloadable ONNX model. Revisit only for a fixed, versioned model. |
| [`WONNX`](https://github.com/webonnx/wonnx) | Historically Rust/WebGPU oriented. | Its upstream repository was archived in 2025. | Exclude from the maintained-runtime shortlist. |

### Browser and offline constraints

ONNX Runtime Web documents separate JavaScript, WebAssembly, and model assets; conditional imports and custom builds can reduce runtime size, while model caching avoids repeat downloads. These are possible optimizations, not evidence that a particular Rusticker build is small. Record compressed and decoded sizes separately for the JS/WASM runtime, encoder graph, and decoder graph. Measure cold initialization, warm inference, peak memory, and offline behavior on the supported browser matrix.

The model must be loaded only after an explicit user action. Prefer a same-origin, versioned static asset and an on-demand cache with visible size, cancellation, and a clear unavailable/offline fallback. Do not precache a 38.8 MB checkpoint-derived model in the initial PWA install. Model downloads contain no user image; image pixels and prompts stay in the existing worker and never go to a server.

## Model comparison

| Candidate | Task and evidence | License and asset cost | Fit |
| --- | --- | --- | --- |
| [MobileSAM](https://github.com/ChaoningZhang/MobileSAM) | Promptable segmentation, which can support a user click/box on one ambiguous sticker. Upstream supports ONNX export. Its paper reports about 10-12 ms on a single GPU and says CPU execution is possible; its repository reports about 3 s on a Mac i5 CPU. These are upstream measurements, not browser/WASM or sticker measurements. | The upstream checkpoint is 38.8 MB. The code repository declares Apache-2.0, but the license and redistribution terms for the exact checkpoint and derived ONNX files must be verified separately before shipping. The official export wrapper takes precomputed image embeddings as input; a complete browser inference path therefore needs a compatible image-encoder graph as well as the prompt-mask graph. Measure both. | **Best first prompted candidate**, with an explicit review step. The paper and checkpoint do not establish quality for Rusticker stickers. Automatic mask generation may multiply runtime and memory costs. |
| [Original SAM](https://github.com/facebookresearch/segment-anything) | Promptable and browser examples exist. The official ONNX example exports the prompt encoder/mask decoder around image embeddings; the image encoder remains a separate requirement. | Apache-2.0 code; large image-encoder checkpoints (hundreds of MB to GB, depending on variant) make initial delivery expensive. Check each checkpoint separately. | Useful as an architecture reference, not the first downloadable candidate. |
| [Ultralytics YOLO segmentation](https://docs.ultralytics.com/tasks/segment/) | Produces category-conditioned instance masks and is exportable to ONNX. Official pretrained models target the COCO classes, which do not represent arbitrary stickers. COCO mAP is not a sticker-split metric. | The project offers AGPL-3.0 or a commercial Enterprise license. Do not distribute its code/weights in Rusticker without an explicit license decision and audit of the exact checkpoint. | **Exclude for now** due task mismatch and license risk. A separately trained permissive model would need new evaluation. |
| Custom synthetic sticker-instance model | A compact model predicting instance masks, boundary/energy maps, or markers may align better with the existing Rust watershed post-processing. The Deep Watershed Transform is a research reference for predicting energy maps that separate instances, not a model currently used by Rusticker. | No weights, license, model size, or training data are selected. A synthetic training/evaluation corpus and reproducible training/export pipeline would be additional work. | **Potential automatic route**, but it needs a separate training and model-asset decision; do not claim feasibility or quality yet. |

The MobileSAM paper's reported results compare its promptable masks to SAM on general segmentation tasks; they do not evaluate sticker pairs, chroma-key sheets, connected artwork, or Rusticker's output contract. The official MobileSAM export script uses `image_embeddings` as an input to the exported graph, so the decoder export alone is not a full image-to-mask model.

## Synthetic evidence available today

`core/tests/watershed_evaluation.rs` generates 16 masks with known instance masks and compares connected components with a deterministic watershed candidate. Running `cargo test -p rusticker-core --test watershed_evaluation -- --nocapture` produced:

| Method | Correct instance count | Missed splits | False splits | Notable fixture results |
| --- | ---: | ---: | ---: | --- |
| 8-connected component baseline | 10/16 | 6 | 0 | Misses overlapping disks and 3-12 px bridges; preserves single ring, star, and ambiguous one-object dumbbell. |
| Test-only watershed candidate | 13/16 | 0 | 3 | Splits overlapping disks and bridges; incorrectly splits the single ring into 7, the single star into 5, and the one-object dumbbell into 2. |

The watershed candidate's matched IoU was 0.861 on overlapping disks and 0.940 on the 12-pixel bridge, but only 0.376 for the ring and 0.500 for the ambiguous one-object dumbbell. It is test-only, not production behavior, and these results are not ONNX results. They show why assistance must retain the original result and request user review.

No model was executed against these masks in this change. Therefore MobileSAM/YOLO/custom-model instance-count accuracy, IoU, boundary F1, false-split/merge rate, ONNX runtime compatibility, cold/warm latency, peak memory, and browser asset size are **not measured**. Do not substitute generic-paper or COCO metrics for these missing measurements.

## Follow-up gates for issue #55

1. Pin runtime, model source and revision, ONNX export/opset, and SHA-256. Audit code, checkpoint, export, and training-data licenses separately.
2. Run the exact encoder and decoder ONNX graphs with `tract` compiled for `wasm32-unknown-unknown` in a real browser worker. Record every unsupported operator/attribute and numerical parity against the reference exporter. If that fails, run the exact same graphs using ONNX Runtime Web WASM and record the specific reason for the fallback.
3. Compare the baseline, current split proposal, and model-assisted proposal on generated masks with touching pairs, narrow bridges, overlaps, concavities, holes/rings, stars, transparent edges, varied scale/rotation, and single-object controls. Report instance-count accuracy, false splits/merges, matched mask IoU, and boundary F1. Keep a held-out generated fixture seed set.
4. Measure first-use download bytes, cached bytes, JS/WASM/model asset bytes, model load time, cold/warm inference, and peak memory on desktop and low-resource mobile browsers. Test cancellation and operation after a second launch with network disabled.
5. Add only a user-requested advanced action. Keep the original result visible, label assisted results as proposals, require user review/acceptance, and preserve the current result if assets, runtime, or inference fail.

A model passes only if it improves the sticker-specific split metrics over the current workflow without introducing unacceptable false splits, and meets a documented low-resource time/memory/download budget. The thresholds must be set before tuning on held-out fixtures. Until that test exists, the result of this issue is a prioritized proof-of-concept plan, not authorization to ship ONNX assistance.

## Sources

1. Sonos, [`tract` repository and browser/WASM example](https://github.com/sonos/tract); [`tract` ONNX operator registry](https://github.com/sonos/tract/blob/main/onnx/src/ops/mod.rs).
2. ONNX Runtime, [Web runtime and supported browser execution providers](https://onnxruntime.ai/docs/get-started/with-javascript/web.html); [deployment assets, file-size considerations, and model caching](https://onnxruntime.ai/docs/tutorials/web/deploy.html).
3. Pyke, [`ort-web` backend](https://github.com/pykeio/ort/tree/main/backends/web); [`ort` browser example](https://github.com/pykeio/ort/blob/main/examples/README.md).
4. MobileSAM, [official repository, checkpoint, CPU/GPU results, ONNX export](https://github.com/ChaoningZhang/MobileSAM); [export wrapper](https://github.com/ChaoningZhang/MobileSAM/blob/master/scripts/export_onnx_model.py); Zhang et al., [Faster Segment Anything: Towards Lightweight SAM for Mobile Applications](https://arxiv.org/abs/2306.14289), arXiv:2306.14289 (2023).
5. Kirillov et al., [Segment Anything](https://arxiv.org/abs/2304.02643), arXiv:2304.02643 (2023); [official SAM repository and license](https://github.com/facebookresearch/segment-anything).
6. Ultralytics, [instance segmentation models and COCO evaluation](https://docs.ultralytics.com/tasks/segment/); [repository licensing options](https://github.com/ultralytics/ultralytics).
7. Bai and Urtasun, [Deep Watershed Transform for Instance Segmentation](https://arxiv.org/abs/1611.08303), arXiv:1611.08303 (2016). Research context only; Rusticker does not implement this learned method.


