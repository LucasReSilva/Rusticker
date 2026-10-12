## Context

Rusticker is a static SvelteKit app. User-selected images are decoded and processed locally through a Rust/WebAssembly worker. WebMCP would expose JavaScript application actions to browser agents or extensions, whose tool results may become model input outside the page. Issue #50 is a feasibility gate for implementation issue #51.

## Goals and non-goals

**Goals:** check the current draft and browser availability; preserve the image privacy guarantee; propose a useful but minimal action surface; define testable conditions before implementation.

**Non-goals:** ship tools, remote inference, inspect private images, or rely on model safety features as access control.

## Decisions

1. Recommend a conditional, feature-detected enhancement only. The current Community Group draft is not a W3C Standard, and Chrome describes an Origin Trial/local testing flag; normal app operation must not depend on WebMCP.
2. Use a small imperative adapter if implementing the Svelte workflow. Keep API references isolated, register/unregister with lifecycle, use the same application actions as the UI, and fail closed when unsupported.
3. Expose no pixels, files, names, hashes, sticker crops, or metadata derived from image content. Do not expose worker/WASM internals. Treat tool results as potentially forwarded by browser agents/extensions.
4. Keep tools same-origin, with no `exposedTo`, cross-origin frame delegation, or third-party embedding. Use static application-authored descriptions, bounded schemas and outputs, strict runtime validation, and visible synchronized UI state.
5. Start with `open-image-picker` and read-only `get-editor-status` only. The latter returns a coarse fixed enum, never counts/settings/dimensions. Defer detection and editing actions until a workflow and cancellation evaluation supports them. Do not expose download/export as a tool.
6. Verify unsupported-browser behavior and retain the existing UI as the complete fallback. Revisit API and browser support at implementation time because both are experimental and may change.

## Risks and trade-offs

- A browser agent can transmit tool output to a remote model; even browser-local callbacks do not establish that their inputs and outputs remain local.
- Overly descriptive or user-controlled tool metadata/results can enable indirect prompt injection. Keep all tool text static and outputs fixed and small.
- Browser support and API shape may change. Feature detection and an isolated adapter limit compatibility impact but do not make the draft interoperable.
- A coarse editor state is less capable than detailed counts or per-sticker information, deliberately reducing information disclosure.

## Migration

No product migration. Issue #51 may proceed only if its implementation verifies the gates in `docs/webmcp-evaluation.md` and does not weaken the privacy or fallback guarantees.
