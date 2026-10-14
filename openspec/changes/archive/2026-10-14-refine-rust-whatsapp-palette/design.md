## Context

See proposal.md for motivation. The theme already centralizes colors as OKLCH tokens and checks base contrast and sRGB gamut. Shared buttons and linked badges still dilute filled backgrounds with alpha on hover, which can invalidate a base contrast result. The design showcase renders the existing variants in both themes.

## Goals / Non-Goals

**Goals:** Increase orange saturation within sRGB, preserve readable orange links, make green pack guidance recognizable, and verify the actual rendered interaction colors.

**Non-Goals:** Exact reproduction of an external brand swatch, new UI primitives, theme persistence changes, or export behavior changes.

## Decisions

1. Keep orange primary and ring tokens, with a deeper saturated orange in light mode and brighter orange in dark mode. A literal bright mascot orange with white text cannot satisfy small-text AA; theme-specific luminance preserves identity and legibility. Color the header wordmark with the primary token.
2. Shift secondary/accent greens toward WhatsApp's cooler green family and use the existing secondary surface for pack guidance and pack-download buttons. Keep the main download action orange, as required by the current design-system contract.
3. Add opaque `primary-hover`, `secondary-hover`, and `destructive-hover` semantic tokens. Both buttons and linked badges consume them. Unlike opacity or ad-hoc mixes, their foreground contrast is independently checkable and does not depend on the parent surface.
4. Extend the existing color-math checks to hover backgrounds and focus against page, card, popover, muted, secondary, accent, and hover surfaces. Browser checks verify that components consume the tokens, including inside forced theme panels. Existing showcase variants already exercise the changed components.
5. Keep all values in app.css and update DESIGN.md from the same color math. No visible text changes or locale additions are necessary. No data leaves the browser and there are no new requests or dependencies.
6. Keep the PWA/browser theme color aligned with the light primary token. Manifests cannot resolve CSS variables, so retain the existing literal metadata exception and the test that compares it to the CSS-derived sRGB value.

## Risks / Trade-offs

- Greater saturation can leave sRGB or reduce contrast → retain gamut checks and evaluate all affected pairs before selecting final values.
- Hover can regress separately from resting controls → add hover pairs and browser verification on both themes.
- A focus ring may blend into an orange filled control → use an offset ring on filled buttons and linked badges so it contrasts with the surrounding surface.

## Migration Plan

Deploy through the usual feature PR to develop. Tokens and consumers ship together with no stored-data migration. Reverting the commit restores the previous theme.
