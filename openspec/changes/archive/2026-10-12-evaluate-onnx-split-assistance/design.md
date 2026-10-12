## Context

See `proposal.md` for motivation. Rusticker currently runs its deterministic detector and bounded split proposal in `core/` compiled to WebAssembly in the existing worker. The follow-up feature issue requires an explicit user choice and review; this issue is only a feasibility decision record. Public runtime and checkpoint support changes over time, so compatibility and licensing claims must be tied to primary sources and checked against pinned versions before implementation.

## Goals / Non-Goals

**Goals:**

- Decide whether a practical ONNX model/runtime pair can improve the sticker-specific split workload without weakening privacy, offline behavior, or low-resource support.
- Separate a user-prompted general segmenter from an automatic instance model; they solve different tasks and have different UX and quality expectations.
- Provide a reproducible synthetic benchmark plan and explicit go/no-go gates for issue #55.

**Non-Goals:**

- Ship an inference runtime, model, download, or model-assisted UI.
- Treat generic COCO object classes as ground truth for arbitrary sticker artwork.
- Use private or user-provided images, remote inference, or content telemetry.

## Decisions

1. **Evaluate the workload before selecting a runtime.** Reuse the existing synthetic touching-sticker fixtures and add procedural cases with known instance masks: touching pairs, narrow bridges, overlaps, concavities, holes, varied scales/rotations, transparency, and uniform-background spill. Report split success, false splits/merges, mask IoU/boundary F1, cold start, warm inference, peak memory, and compressed download bytes. Keep the current deterministic Rust detector as the baseline.

2. **Prefer pure Rust/WASM first, but require an operator-level proof.** Evaluate the supported public `tract` facade as the first direct Rust/WASM ONNX path. Evaluate `ort-web` only as a fallback: its Rust API can target the browser but delegates inference to ONNX Runtime Web's JavaScript/WASM assets, so it does not meet the pure-Rust preference. Do not infer model compatibility from a runtime's broad ONNX claims; import and run the exact exported model with its operators, shapes, and dtypes in the target browser build before recommending it.

3. **Separate prompted segmentation from automatic splitting.** MobileSAM/SAM-style promptable masks may be evaluated only as an explicit advanced-mode user-assisted proposal. A generic pretrained category detector is not considered an automatic sticker-instance model. Automatic assistance requires a permissively redistributable model trained and evaluated on synthetic sticker-instance data, or a separate training feasibility decision.

4. **Treat assets and licenses as release gates.** Record the exact runtime version, model/checkpoint/export source, checksum, license for code and weights, ONNX operators, compressed bytes, precache/cache strategy, and cold/warm resource measurements. Do not bundle, download, or precache any model during ordinary processing. No inference starts until the user explicitly requests it; fallback leaves the original detector result available.

5. **Make the decision evidence-led.** Recommend the Rust/WASM path only if the exact model passes the synthetic quality gate and operator/browser probe, and its low-resource time/memory and transfer cost fit the documented budget. Otherwise record the concrete gap and compare `ort-web`; if neither passes, keep issue #55 blocked and recommend a purpose-trained small model or no ONNX feature.

## Risks / Trade-offs

- **Generic models may not recognize stickers as instances** ? do not use COCO scores as sticker quality; require sticker-specific synthetic instance masks.
- **Runtime marketing claims can hide unsupported operators or large artifacts** ? test the exact exported graph and measure the production build assets.
- **Promptable models may be slow or require user interaction** ? keep them opt-in in advanced mode and measure interaction and inference separately.
- **A restrictive or ambiguous checkpoint license can block distribution** ? verify the exact weight and ONNX artifact licenses before selection; exclude candidates with unresolved rights.
- **Synthetic data may not represent real sticker art** ? vary geometry, alpha, textures, and backgrounds, and document that the decision is provisional until a privacy-safe representative evaluation corpus is approved.

## Migration Plan

No product migration applies. Publish the evaluation report and update architecture/roadmap links. If a candidate passes, issue #55 must have its own OpenSpec implementation change, model asset review, explicit opt-in UX, offline cache accounting, cancellation, fallback, and browser benchmarks. If no candidate passes, keep the existing pipeline unchanged and record the blocker in the roadmap.
