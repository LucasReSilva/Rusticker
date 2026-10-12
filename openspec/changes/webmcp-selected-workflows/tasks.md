## 1. Implement the isolated WebMCP adapter

- [x] 1.1 Add typed definitions and feature detection for `document.modelContext`.
- [x] 1.2 Register the reviewed picker and coarse-status tools with empty schemas and strict runtime input validation.
- [x] 1.3 Bound outputs to fixed status values and clean up registration using `AbortSignal`.
- [x] 1.4 Add a headless Svelte lifecycle component and localized metadata for all supported locales.
- [ ] 1.5 Integrate the component with the live editor page and map its actual state/picker behavior. (Deferred to the page integration owner; this worktree must not edit route or global-state files.)

## 2. Verify behavior and documentation

- [x] 2.1 Add focused tests for unsupported API, registration, cleanup, strict input rejection, bounded output, invalid state, and registration failure.
- [x] 2.2 Document the implemented tool boundary and update references to the current primary API surface.
- [ ] 2.3 Validate current Chrome trial/flag behavior and the normal image-to-pack flow in browser tooling. (Requires a supported WebMCP browser environment.)
- [x] 2.4 Run focused unit tests, web checks, localization/design checks, and strict OpenSpec validation.
