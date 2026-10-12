## Context

See `proposal.md` for motivation and scope. This is documentation-only work: the Rust core, Web Worker, UI, and export pipeline are implemented, but `ARCHITECTURE.md` still labels itself a target architecture. Existing behavior contracts remain authoritative and are not changed.

The audit has confirmed several distinctions the documentation must preserve:

- The detector classifies RGB values through a configurable HSV background rule; the current mask does not use the source alpha channel. The extraction step makes alpha from component membership and a local 3x3 average, which is not general alpha matting.
- Foreground cleanup uses 3x3 morphological opening, 8-connected components, and a 0.4% image-area filter. Touching or diagonally connected foreground regions stay one component.
- Browser decoding happens locally, including EXIF orientation. The app copies and transfers pixel buffers to a Comlink worker, where the Rust/WASM detector runs. Synchronous WASM work cannot be interrupted; superseded results are discarded by the runtime.
- Sticker encoding, ZIP creation, and downloads happen locally. The static app and WASM assets may be fetched as application resources; this is distinct from sending user image data.
- Current technical sources include the locked versions `imageproc 0.25.1` and `image 0.25.10`; references to their APIs must use matching versioned documentation.

Relevant behavior contracts were reviewed in `sticker-detection`, `detection-runtime`, `sticker-editor`, and `sticker-export`. The change declares `skip_specs: true`: no observable behavior requirements change.

## Goals / Non-Goals

**Goals:** make `ARCHITECTURE.md` a source-verified guide to current behavior; distinguish current implementation, known limitations, and deferred work; give maintainers diagrams that match the data flow and privacy boundary; provide a small, traceable bibliography; use parallel read-only audits while keeping one owner for shared documentation edits.

**Non-Goals:** change detector or export behavior; decide or implement alpha handling for transparent inputs; implement watershed, matting, ONNX, or other roadmap items; rewrite the behavior specs; add a citation solely to make a simple heuristic look research-validated; or add a diagram-rendering dependency.

## Decisions

### Maintain an evidence ledger before editing prose

For each technical claim, record the source file/function, relevant test or behavior requirement, documentation sentence/diagram, and reference (when one is applicable). Label claims as current behavior, known limitation, or deferred proposal. If code, tests, and a spec disagree, document the discrepancy for maintainers instead of silently changing the behavior contract.

The evidence ledger should link at least:

- Core pipeline: `core/src/lib.rs`, `color.rs`, `mask.rs`, `components.rs`, `alpha.rs`, `order.rs`, `frame.rs`, `wasm.rs`, and synthetic tests.
- Browser path: `web/src/lib/tool/decode.ts`, `web/src/lib/detection/index.ts`, `runtime.ts`, `worker.ts`, `engine.ts`, editor state, and export modules.
- Behavior contracts: the four reviewed specs named in Context.

### Use parallel subagents for disjoint audits and one documentation editor

Subagents may independently audit the core algorithm, the WASM/worker boundary, and the Svelte/editor/export flow. They return file/function evidence, discrepancies, candidate sources, and diagram suggestions without editing shared files. The coordinator owns `ARCHITECTURE.md`, reconciles findings, checks all citations, and updates README or code comments only after the evidence is consolidated. A final subagent review is read-only and checks diagram/data-flow consistency and unsupported claims.

This limits collisions in the central architecture document while allowing independent discovery. If an implementation change appears necessary, stop and create a separate behavior change; it is outside this documentation issue.

### Use Mermaid to explain two different levels of flow

Add a detector flowchart showing decode output entering the core pipeline: RGB-to-HSV background classification, 3x3 opening, 8-connected components, area filter, component crop/alpha smoothing, reading order, and 512x512 framing. Label that source alpha is currently ignored and that smoothed binary-mask alpha is not a semantic matte.

Add an end-to-end sequence or flow diagram separating browser main-thread work, the Web Worker, Rust/WASM, browser encoders, JSZip, and the local download. Show the defensive pixel-buffer copy, transfer directions, error-code return, and local export. Keep app-asset loading visually distinct from user-image data; do not imply that the app never makes network requests for static resources.

Use standard Mermaid code fences already supported by GitHub/Markdown. Validate syntax with available tooling or GitHub rendering; do not add a runtime or build dependency for diagrams.

### Cite sources for the claim they actually support

The reference list should be curated and version-aware:

- Use Smith, [“Color Gamut Transform Pairs” (1978)](https://doi.org/10.1145/965139.807361), for RGB/HSV model context, not as evidence that Rusticker's threshold values are optimal.
- Use the locked-version [`imageproc 0.25.1` morphology API](https://docs.rs/imageproc/0.25.1/imageproc/morphology/fn.open.html) and [connected-components API](https://docs.rs/imageproc/0.25.1/imageproc/region_labelling/fn.connected_components.html) to document concrete library semantics. Describe the project's thresholds from code, tests, and its spec.
- Use the [`image 0.25.10` filter documentation](https://docs.rs/image/0.25.10/image/imageops/enum.FilterType.html) to identify Lanczos3; explain Rusticker's own premultiplication step from its implementation.
- Use official [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/), [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects), and [Comlink](https://github.com/GoogleChromeLabs/comlink) documentation for boundary and transfer mechanics.
- Use arXiv papers such as [Deep Image Matting: A Comprehensive Survey (arXiv:2304.04672)](https://arxiv.org/abs/2304.04672) and [Deep Watershed Transform for Instance Segmentation (arXiv:1611.08303)](https://arxiv.org/abs/1611.08303) only in a clearly marked comparison/future-work section. They do not describe the current box-mask alpha smoothing or connected-component implementation.

Do not attach a paper to a project-specific heuristic (such as the 0.4% component cutoff) unless the paper actually evaluates that rule. State that such values are documented by the repository's behavior spec and deterministic tests.

### Treat discrepancies as documentation findings, not behavior changes

The input-alpha gap and the architecture guide's stale “target architecture” status should be described plainly. If documentation reveals a mismatch in the current requirement spec, add it to a follow-up note/issue; do not modify the requirement or core algorithm in this change.

## Risks / Trade-offs

- [A research citation could be read as validation of a different algorithm] → Explain its narrow relevance and explicitly separate comparison/future techniques from current implementation.
- [Diagrams can drift from code] → Tie every node and edge to an inspected module/function and include a verification task after editing.
- [Privacy language could overpromise zero network traffic] → Describe local handling of user data separately from fetching static app/WASM assets.
- [Subagents may provide conflicting summaries] → Use read-only, disjoint audits; coordinator resolves against source/tests/specs and remains sole writer of shared docs.
- [A code/spec discrepancy invites accidental scope expansion] → Keep this proposal documentation-only and route behavior decisions to separate OpenSpec changes.

## Migration Plan

No runtime migration is required. Review and merge the documentation-only change into `develop`; do not create a release solely for this update. If code comments change, run the relevant formatting/type checks, but do not rebuild WASM unless executable code in `core/` changes.
