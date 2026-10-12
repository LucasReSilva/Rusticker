## Why

Rusticker's current violet palette does not reflect the product identity requested for the post-release roadmap. Replacing it with Rust-inspired orange and WhatsApp-inspired green gives the app a recognizable visual direction while retaining the existing contrast and privacy guarantees.

## What Changes

- Replace the violet semantic palette with Rust-inspired orange primary tokens and WhatsApp-inspired green secondary/accent tokens in light and dark themes.
- Preserve accessible text, focus, input-boundary, checkerboard, and destructive-state contrast, and document the measured ratios.
- Align the PWA browser theme color and existing sticker-mark colors with the new palette without changing the mark's geometry; regenerate derived PWA icons.
- Verify the main app and development-only design-system preview across supported locales and both themes.
- Out of scope: changes to theme switching, application behavior, image processing, localized copy, or the sticker-mark design itself.
- This change touches `web/` only; `core/` is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: define orange primary and green supporting brand colors while preserving the existing contrast and accessibility guarantees.

## Impact

- `web/src/app.css` semantic theme tokens and their automated contrast checks.
- `web/src/lib/seo/manifest.ts`, related tests, the existing SVG app icon and its generated PWA assets.
- `DESIGN.md` and the existing development-only `/_design` showcase.
- No new dependencies, user-facing messages, APIs, or changes to image data handling.
