# WebMCP feasibility and safe-tool evaluation

**Decision:** conditional go for a small, opt-in, progressive enhancement; no-go for exposing image data, generated assets, or consequential export actions to agents. WebMCP is an experimental draft, not an interoperable baseline. The #51 adapter is mounted on the editor page and exposes only the reviewed picker and coarse-status tools when the browser API is present.

## Scope and date

This evaluation was completed on 2026-10-12 against the current WebMCP Community Group draft and Chrome's WebMCP documentation. It addresses issue [#50](https://github.com/LucasReSilva/Rusticker/issues/50) and gates implementation issue #51. It does not establish support in browsers other than the implementations documented by their vendors.

## Compatibility

WebMCP exposes page functionality as tools with structured input schemas. It has imperative JavaScript registration and declarative HTML form annotations. Rusticker's Svelte editor has stateful, asynchronous actions, so a small imperative adapter is the better fit if the API stabilizes; declarative tools would only fit a conventional form workflow.

The specification remains a W3C Web Machine Learning Community Group draft report and explicitly is not a W3C Standard or on the Standards Track. Chrome's documentation currently describes an Origin Trial (Chrome 149+) and a local-development flag. The API is therefore unsuitable as a required product path: use runtime feature detection, leave the normal interface fully functional when absent, and avoid claiming cross-browser support. The current draft and Chrome documentation expose the imperative API through `document.modelContext.registerTool(tool, { signal })`; an abort signal removes registrations as their owner is torn down. Rusticker isolates those calls in a small adapter so API changes do not spread through Svelte components. The editor page mounts the adapter, feature-detects support, and keeps the standard UI available in unsupported browsers.

## Privacy and security boundaries

Rusticker's existing guarantee remains controlling: user image data never leaves the browser. Browser agents and extensions can forward tool inputs and outputs to remote model providers, so “runs in a page callback” does not mean “stays private.” A tool must never accept or return image pixels, data URLs, blobs, file bytes or names, image hashes, sticker crops, or image-derived metadata. Do not expose the detector/WASM handles or worker protocol through WebMCP.

WebMCP's own draft documents indirect prompt injection in tool metadata and outputs, privacy leakage through over-parameterized tools, and risks around cross-origin and private browsing. Tool descriptions and schemas must be static, short, and authored by Rusticker; returned values must be bounded enums or fixed generic messages, never user-controlled text. Keep the default same-origin boundary; do not set `exposedTo`, delegate the `tools` Permissions Policy to frames, or place tools in third-party frames. The web app should not add remote inference, analytics, or network requests carrying image-derived data.

Inputs must be strictly validated in application code, with small bounded schemas and no arbitrary URLs, paths, selectors, scripts, or free-form text. Registration should be absent when unsupported and cleaned up on teardown. All changes initiated by tools must use the same application actions and visible state as the UI; do not create an alternate path around validation, cancellation, or user review. Do not rely on model confirmations or draft annotations as an authorization boundary.

## Recommended initial tool surface

Keep the first implementation to at most two narrowly scoped tools:

| Tool | Behavior | Output / constraints |
|---|---|---|
| `open-image-picker` | Opens the existing image-selection control; the person chooses a file through the browser picker. | Fixed generic status only. Never accepts a file path or bytes. If browser activation rules prevent opening it, return an actionable generic failure and keep the visible picker available. |
| `get-editor-status` | Reads a coarse application workflow state. | One of `empty`, `image-loaded`, `reviewing-results`, or `ready-to-export`; no counts, names, hashes, settings, dimensions, or content. Mark read-only. |

Do not expose processing, sticker editing, reorder, or pack download in the first implementation. Revisit a single explicit `start-detection` tool only if an evaluation demonstrates a useful user-directed workflow, the user has already selected the image, work stays in the existing worker, output remains generic, cancellation is honored, and the UI visibly reflects progress and completion. Do not expose an export/download tool: it creates a file from user content and the browser's agent-mediated confirmation behavior is not sufficiently interoperable to serve as the app's authorization boundary. The user can always complete these actions through the existing UI.

## Implementation gates for issue #51

1. Prototype behind feature detection in a supported Chrome trial/flag environment; verify the unsupported-browser path and static deployment.
2. Add tests for absent API, registration and teardown, strict input rejection, fixed-size outputs, visible state synchronization, cancellation, and repeated invocation.
3. Verify with DevTools or the available browser tooling that tools expose no image-derived values and that no origin/frame delegation is configured.
4. Review each tool against prompt-injection and over-parameterization risks; tool metadata and results must remain application-authored and bounded.
5. Confirm the normal upload, detection, review, and export flow works unchanged with WebMCP unavailable or disabled.
6. Re-evaluate browser support and draft shape at implementation time. If useful operation requires an unsupported API, remote service, exporting private data, or bypassing user review, defer the feature rather than weakening the privacy contract.

## Issue #51 implementation status

The editor page now connects `open-image-picker` to the existing hidden file input through `showPicker()`, which reports unavailable when the browser denies activation or lacks the method. `get-editor-status` maps local editor state to `empty`, `image-loaded`, `reviewing-results`, or `ready-to-export`; counts and underlying state are never returned. Both tools use localized static metadata, require an empty input object, and register with an abort signal. The ordinary upload, detection, review, and export UI remains the fallback.

Automated tests cover the adapter, bounded status mapping, and picker activation failure. A browser smoke test with Chrome's WebMCP Origin Trial or local testing flag remains environment-dependent; it must be run in a browser configured for the experimental API before claiming that browser integration was manually verified.

On 2026-10-12, this development environment had Chrome 155 installed, but its normal profile was not modified to enable the WebMCP flag. An automated attempt to inspect `chrome://flags/#enable-webmcp-testing` with an isolated temporary profile did not reach the page evaluation and was stopped. Therefore, the Chrome API registration and end-to-end browser smoke remain unverified. Enable the documented local flag in a disposable Chrome profile or use an Origin Trial-enabled deployment, then verify tool discovery, both fixed outputs, picker activation failure, and the normal image-to-pack path.

## Primary references

- [WebMCP draft report](https://webmachinelearning.github.io/webmcp/), 2026-10-09. Status, API, origin/permissions policy, security and privacy considerations.
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), updated 2026-10-07. Current Origin Trial/local flag state, API families, and limitations.
- [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), updated 2026-09-21. Registration, annotations, cancellation, origin exposure, and API lifecycle.
- [Chrome WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools), updated 2026-09-01. Untrusted/consequential/read-only annotations, origin exposure, and bounded metadata/output guidance.
- [Chrome WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), 2026-05-18. Tool strategy, schema validation, UI synchronization, and evaluation-driven testing.
