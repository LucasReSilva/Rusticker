## Context

Rusticker is a static SvelteKit application. Its processing data stays in the browser, but browser agents or extensions may forward tool outputs to remote systems. The WebMCP API and browser support remain experimental; the ordinary editor must continue to work when the API is unavailable or disabled.

## Decisions

1. Isolate the experimental `document.modelContext.registerTool()` surface in `web/src/lib/webmcp/registry.ts`. A headless Svelte component owns registration lifecycle and supplies localized tool metadata.
2. Register exactly two tools from the #50 evaluation: `open-image-picker`, which asks the existing file picker to open and returns a fixed result, and read-only `get-editor-status`, which returns one of four coarse workflow states.
3. Both tools accept only an empty object. Validate input at runtime even when the browser also validates the schema. Reject extra fields; never silently ignore file paths, hashes, or other supplied values.
4. Tool metadata is localized. Result values are fixed enums/objects authored by Rusticker. Do not return user-controlled strings, file details, sticker counts, image-derived data, or arbitrary exception messages.
5. Use a registration `AbortSignal` to remove tools when the component unmounts or locale-dependent metadata changes. Registration errors are swallowed after cleanup and never affect the human editor.
6. Do not request or set cross-origin exposure, delegate the `tools` Permissions Policy, or expose these tools in third-party frames.
7. The adapter takes narrow callbacks from the editor. The app-level integration is intentionally left to the caller so it can map existing state and picker behavior without duplicating editor logic.

## Risks

- Browser support and draft API details can change. Feature detection and isolation limit impact but do not promise interoperability.
- A browser may refuse to open a picker without transient user activation. The tool returns a fixed `picker-unavailable` result and leaves the visible picker available.
- Exposing status can still reveal workflow activity. The status is restricted to four broad states and includes no counts, settings, file metadata, or content.
- Tool descriptions may be consumed by remote agents. They are localized, static, application-authored, and do not contain image-derived information.

## Integration point

The consuming tool page should render `<WebMcpTools>` with callbacks backed by the existing picker and editor state. This change does not mount it in a route or modify global editor state. The page must map state to `empty`, `image-loaded`, `reviewing-results`, or `ready-to-export` and preserve normal UI behavior when the API is absent.
