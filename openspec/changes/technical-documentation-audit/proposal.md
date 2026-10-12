## Why

Rusticker's processing and browser pipeline are implemented, but the architecture guide still calls itself a target design and does not consistently distinguish current behavior from deferred work. A code-backed documentation review will make the techniques, limits, privacy boundaries, and research context easier to verify without changing product behavior.

## What Changes

- Audit implemented image processing, Rust/WASM bindings, worker scheduling, frontend state, and local export against source, tests, and current behavior specs.
- Update `ARCHITECTURE.md` to describe the current implementation, with explicit sections for observed behavior, known limitations, and deferred roadmap work.
- Add Mermaid diagrams for the image-processing stages and browser-to-worker-to-WASM/export flow, with privacy and transfer boundaries shown accurately.
- Add a curated bibliography of research papers and primary technical documentation. Map each citation to the claim it supports; separate background/future techniques from algorithms Rusticker currently uses.
- Correct or add focused code documentation in `core/` and `web/` only where it materially explains non-obvious implementation behavior; update README links when needed.
- Out of scope: changing processing, editor, export, privacy, or UI behavior; adding dependencies; implementing watershed, alpha matting, or ONNX; changing OpenSpec behavior requirements; and broad product-copy rewrites.

## Capabilities

### New Capabilities

None. This is documentation-only work; `.openspec.yaml` sets `skip_specs: true` because no product behavior changes.

### Modified Capabilities

None. Existing behavior specifications remain unchanged.

## Impact

- Documentation: primarily `ARCHITECTURE.md`, with a focused README update and a references section.
- `core/` and `web/`: documentation comments may be clarified; executable behavior, APIs, and dependencies do not change.
- No user data, network path, build pipeline, or release automation changes.
