## Context

See `proposal.md` for motivation and `specs/web-app-shell/spec.md` for the behavior contract. `+layout.svelte` already owns the shared header and main landmark, and prerendered content pages use this layout. The current version is `0.3.0` in `web/package.json`, synchronized by the existing release workflow.

## Goals / Non-Goals

**Goals:** Keep the version tied to the build's package metadata, localize every footer string, preserve the active locale for the privacy link, and position the footer after content without layout overlap.

**Non-Goals:** Add a runtime version API, a release announcement system, or a new design-system primitive.

## Decisions

- Render `AppFooter.svelte` from the shared layout. The component can use semantic `<footer>` and `<nav>` elements with existing token-based utility classes; no new UI primitive is needed. A page-by-page footer would duplicate content and could be absent from fallback routes.
- Import `web/package.json` at build time for the version. This follows the existing synchronized release version and works in prerendered HTML without a runtime request. A manually maintained string could drift after release automation.
- Put the header, flexing main area, and footer in a viewport-height shell. On short pages the main area expands; on long pages the footer follows content. Flexible wrapping and logical spacing keep 375-pixel screens usable.
- Use Paraglide catalogs for all text and aria labels. Use the existing localized route helper for the privacy link, and static HTTPS links to the repository and changelog. Clicking these links sends no image data; rendering the footer makes no network request.

## Risks / Trade-offs

- [Package version can differ from a separately deployed Git tag] → The footer follows the version already embedded in the web build; the existing release synchronization checks keep package versions aligned.
- [Long translations can overflow on mobile] → Allow line and link wrapping, then cover the narrow viewport with a browser test.
