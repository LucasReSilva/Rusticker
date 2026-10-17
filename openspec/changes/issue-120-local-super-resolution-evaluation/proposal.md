## Why

The current sticker pipeline resizes source pixels with conventional image processing, while users may benefit from learned upscaling for small artwork. A model can also invent edges, damage transparency, create tile seams, or exceed the browser's memory and latency budget, so the repository needs measured evidence before choosing a model or adding an inference runtime.

## What Changes

- Record a reproducible evaluation plan and evidence for candidate local super-resolution models, beginning with Rust/WASM execution of the exact exported ONNX graph.
- Compare conventional high-quality resizing and candidate models on generated illustrations, text, line art, alpha edges, and photos; define quality, compatibility, size, latency, and peak-memory gates.
- Record candidate provenance, graph operators/opset, model and runtime licenses, redistribution constraints, hashes, output alpha behavior, seam behavior, cold and warm timing, and desktop/low-resource measurements.
- Make a go/no-go recommendation and document the exact blockers and reproduction commands.
- Out of scope: production model/runtime dependencies, user-facing UI, production image processing changes, private image fixtures, and release work.

This evaluation may inspect both `core/` and `web/`, but changes only evaluation documentation and synthetic-fixture/harness material; it does not change production behavior in either area.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a research and documentation change with no user-visible or runtime behavior contract changes; `.openspec.yaml` sets `skip_specs: true`.

## Impact

Adds an issue-specific OpenSpec evaluation record. It introduces no production APIs, dependencies, model assets, or runtime code. Candidate model and runtime artifacts are not committed.
