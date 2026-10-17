## Context

See `proposal.md` and `specs/image-upscaling/spec.md`. The existing upscaler already decodes local images in a module worker, validates dimensions, provides a conventional canvas resize, reports stages, supports cancellation by terminating the worker, and returns a local download. The feature should extend that flow rather than create a second page or move pixels through the sticker-detection worker.

The evaluation in `openspec/changes/issue-120-local-super-resolution-evaluation/design.md` found that the BrowserSnip anime 6B graph fails `tract` 0.23.8 shape analysis, while the same graph runs in ONNX Runtime Web's CPU/WASM provider. At 512x512, its first inference took 113.7 seconds, a repeated inference took 166.1 seconds, and the browser-attributed memory delta was about 2.8 GB. These measurements are not product acceptance gates for visual quality; they are constraints that motivate explicit opt-in, small sequential tiles, visible progress, cancellation, and user control. The model asset's redistribution terms remain unclear, so the app must accept a local user-selected model and must not bundle the graph.

## Goals / Non-Goals

**Goals:**
- Add learned inference to the current upscaler worker without changing its conventional default.
- Make the first compatible model contract explicit and reject graphs that do not meet it.
- Keep model and image bytes in local worker memory, and release them when the job ends.
- Bound intermediate/output allocations before processing and preserve a recoverable conventional result.
- Keep runtime loading on demand and support offline use after app-owned runtime assets have been cached.

**Non-Goals:**
- Add ONNX execution to `core/` or change sticker detection/export behavior in this change.
- Distribute a model, choose a model on the user's behalf, fetch model weights, or cache user-selected model bytes.
- Promise a quality improvement or block use based on PSNR, SSIM, preference votes, alpha scores, or seam scores.
- Support arbitrary model tensor layouts, color spaces, data types, scale factors, or preprocessing conventions.

## Decisions

### Extend the existing upscaler worker

Keep file decoding, source validation, conventional resizing, learned inference, alpha reconstruction, and encoding in `web/src/lib/upscaling/worker.ts` or a worker-owned module it imports. The Svelte page sends a `File`, the selected mode, and the locally selected model `File`; the worker reports typed stage/progress/error messages. Cancelling terminates the worker so ONNX sessions and temporary arrays become collectible. The conventional path remains unchanged and does not import the ONNX runtime.

### Use a user-provided model and a narrow contract

The user selects a `.onnx` file. The first supported contract is one dynamic RGB `float32` NCHW input `[1,3,H,W]`, normalized to `[0,1]`, with one finite RGB `float32` output `[1,3,4H,4W]`. Reject fixed spatial input shapes, extra inputs, alpha inputs, unsupported output scale, unexpected output dimensions, or non-finite output. Display file size as information but do not impose the previously removed 20 MiB threshold. Do not persist the model file or place it in service-worker caches.

### Prefer Rust/WASM, use the measured browser WASM fallback for this graph

The `tract` attempt is retained as the preferred architecture for future supported graphs, but the exact browser candidate fails shape analysis in that runtime. Use ONNX Runtime Web 1.30.0 with only the `wasm` execution provider for this experimental implementation. Load the runtime through a lazy import only after learned mode is selected, configure its WASM assets as same-origin build outputs, and include those app-owned assets in the offline cache. Do not enable WebGPU as a substitute for the CPU/WASM path. Show the backend as browser CPU/WASM, not Rust/WASM.

### Tile inference sequentially and reconstruct alpha separately

Convert image regions to normalized RGB NCHW tensors and call `session.run` for one fixed-size 64x64 tile at a time. Place tile starts on a 48-pixel stride; edge-extend the final tile when it reaches beyond the image. For every internal overlap, discard the outer 8 input pixels (32 output pixels) on each side so neighboring tiles meet at the overlap midpoint; clip the retained region to the real image boundary. This keeps only one tile's input and output tensors live at a time. Report completed and total tiles. Check tile count, x4 output dimensions, and estimated bytes before allocation. Preserve source alpha by placing its channel in a temporary RGBA buffer, resizing it independently with the existing browser high-quality resampling path to the actual RGB output dimensions, and combining that alpha with learned RGB. Use the same alpha path for preview and download. Tile seams and edge quality remain visible experimental trade-offs, not gates.

### Keep quality caveats visible but non-blocking

Label the mode as experimental, disclose that learned models may invent detail or create halos, and allow side-by-side comparison with the conventional result. Do not show global metrics as a pass/fail result. Record the existing texture and white-background alpha regressions in developer documentation; neither blocks user access to the model.

### Bound memory and fail without losing the source

Use the existing image-side/pixel validation and add a preflight for model input contract, x4 output dimensions, tile count, and estimated combined RGBA/output/tensor buffers. The preflight limit is a resource-protection rule, not a visual-quality or model-file-size threshold. Keep the source and conventional result URLs alive until the learned output is fully encoded and accepted; on any failure, release the session and buffers and return the original state.

## Risks / Trade-offs

- [CPU/WASM inference may take a long time] → Process sequential tiles, report progress, keep cancel available, and never start automatically.
- [The model can produce poor details or halos] → Keep the experimental label and conventional comparison; quality is advisory per the user's decision.
- [A user-supplied ONNX graph can require excessive memory or unsupported operators] → Inspect the graph contract where available, preflight dimensions/estimated allocation, catch runtime failures, and do not erase the source.
- [The exact candidate's redistribution rights are unresolved] → Do not ship or download its weights; the user chooses the local model.
- [Browser WASM is not the preferred Rust/WASM backend] → Disclose the measured `tract` shape blocker and keep the backend boundary isolated for later replacement.
- [Alpha and tile reconstruction can introduce visible artifacts] → Keep alpha separate, show transparent previews on light/dark backgrounds, and report the limitation without blocking access.

## Migration Plan

No data migration is required. The conventional resize path remains the default. Removing or disabling the learned mode in a later release does not affect previously downloaded images or user data because selected models are not persisted.
