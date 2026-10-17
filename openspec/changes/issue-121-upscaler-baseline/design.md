## Context

See proposal.md for motivation and specs for observable behavior. The web app is a static SvelteKit application with localized routes and message catalogs. Existing image processing is performed locally in browser workers; image inputs must never be uploaded. This change affects `web/` only and adds a standalone tool page rather than altering the sticker-sheet workflow.

## Goals / Non-Goals

**Goals:** Keep browser memory bounded before full pixel decode and output allocation; keep the UI responsive and cancellation immediate; make it clear that conventional resampling does not synthesize detail; integrate the route with localization, static generation, navigation, and existing design tokens.

**Non-Goals:** A learned/ONNX model, Rust/WASM processing, animated media, batch jobs, image persistence/history, or a deterministic cross-browser interpolation kernel.

## Decisions

1. **Use a dedicated module worker and browser Canvas 2D resampling.** The worker owns decode, draw, and PNG encoding using `createImageBitmap`, `OffscreenCanvas`, and `convertToBlob`; the page never performs pixel loops. Canvas smoothing is selected explicitly and its quality value is treated as a browser hint, not a promised algorithm. This avoids shipping another runtime or large pixel-kernel implementation for the baseline. A deterministic Lanczos kernel was considered, but it adds CPU/memory complexity and would not meet the initial conventional-baseline scope. If OffscreenCanvas or PNG encoding is unavailable, return a stable unsupported-environment error rather than blocking the UI with a main-thread fallback.

2. **Validate image metadata before decoding pixels, then validate derived output dimensions.** Read bounded file slices to parse dimensions for PNG, JPEG, and WebP; accept static rasters only and reject APNG/animated WebP. Reject unknown, malformed, or inconsistent metadata. Do not apply an arbitrary encoded-file-size threshold; validate dimensions and pixels before invoking the browser decoder. Set maximum input and output side length to 8192 pixels, maximum input and output pixel count to 16 megapixels, and scale range to 1x–4x. All multiplication uses safe-integer checks before allocation. The 16MP cap limits each RGBA surface to about 64 MiB before browser-internal copies; it is deliberately below the sticker core's 40MP ceiling because this tool can hold both source and output surfaces.

3. **Keep UI state on the page and communicate using a typed worker protocol.** The page owns the selected `File`, source preview URL, requested scale, job state, output preview URL, and download action. Worker requests carry the file and validated dimensions/scale; workers compare decoded dimensions against the inspected metadata before allocating a canvas, allowing only exact or width/height-swapped dimensions for browser-applied orientation. Messages report stage codes and return a PNG `Blob` or stable error code. A cancel or source replacement terminates that job's worker, closes any page-owned bitmap if one exists, revokes obsolete URLs, and ignores late messages by job identity. No image bytes enter local storage, service-worker caches, analytics, or network requests.

4. **Use a localized browser-only route with the shared application shell.** Extend the page route table and generated route list, add translated slugs for all supported locales, register the route in the page mapping, and add a localized header link. Use trailing-slash canonical URLs for the browser-only route, consistent with the existing tool page, and accept URLs with or without that slash. Keep all visible and accessible text in the three Paraglide catalogs. The page uses existing design-system controls and spacing/color tokens; it does not introduce a new primitive. Route metadata and sitemap/prerender verification must include all locale variants and the configured base path.

5. **Output lossless PNG with a locale-neutral filename.** PNG preserves transparency and avoids ambiguous JPEG alpha behavior. Browser encoding may still fail or return no blob, which is surfaced as a localized error while retaining the source. Alternative output formats and quality controls are deferred.

## Risks / Trade-offs

- [Canvas resampling varies by browser and does not restore real detail] → Label the method accurately and do not claim a specific filter kernel or AI quality.
- [Canvas implementations can allocate temporary copies beyond the explicit RGBA surfaces] → Keep source/output at 16MP maximum each, validate before allocation, process one job at a time, terminate workers on cancel, and test browser memory behavior where practical.
- [Header parsing can accept malformed or polyglot data] → Use format-specific bounded parsers, verify the decoder's resulting dimensions match metadata, reject animation and parser/decoder disagreement, and cover malformed/truncated headers with tests.
- [Some browsers lack worker OffscreenCanvas or PNG conversion] → Detect capability in the worker, return a stable code, and retain the original selection; do not silently move expensive work to the main thread.
- [Static routes can break under locale prefixes or a deployment base path] → Use the centralized localized route table and verify all generated pages with the production build checks.

## Migration Plan

No data migration is needed. Add the feature behind its localized route and navigation entry. If a defect requires rollback, revert the feature commit; existing sticker routes and persisted data are unaffected.
