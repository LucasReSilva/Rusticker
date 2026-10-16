## 1. Implement the isolated WebMCP adapter

- [x] 1.1 Add typed definitions and feature detection for `document.modelContext`.
- [x] 1.2 Register the reviewed picker and coarse-status tools with empty schemas and strict runtime input validation.
- [x] 1.3 Bound outputs to fixed status values and clean up registration using `AbortSignal`.
- [x] 1.4 Add a headless Svelte lifecycle component and localized metadata for all supported locales.
- [x] 1.5 Integrate the component with the live editor page, existing picker, and a four-state privacy-preserving editor status mapping.

## 2. Verify behavior and documentation

- [x] 2.1 Add focused tests for unsupported API, registration, cleanup, strict input rejection, bounded output, invalid state, and registration failure.
- [x] 2.2 Document the implemented tool boundary and update references to the current primary API surface.
- [x] 2.3 Run a browser smoke test with Chrome's WebMCP Origin Trial or local testing flag and verify the normal image-to-pack flow. This requires an environment where the experimental API is enabled; record the browser version and flag/trial setup when completed. See [browser smoke evidence](README.md).
- [x] 2.4 Run focused unit tests, web checks, localization/design checks, and strict OpenSpec validation.
