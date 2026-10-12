## Context

See `proposal.md` for motivation. The current palette is defined in `web/src/app.css` as semantic tokens consumed throughout the app. `web/src/lib/theme/contrast.test.ts` already checks text and non-text contrast and sRGB gamut in both themes. The browser manifest and PWA icon source are separate static assets, so they need to be aligned explicitly.

## Goals / Non-Goals

**Goals:**

- Make the Rust-inspired orange the primary action and focus color and use WhatsApp-inspired green for supporting surfaces in both themes.
- Keep text, input boundaries, focus indicators, transparency previews, and destructive actions distinguishable and accessible.
- Keep the public pages, design-system showcase, browser theme color, and installed app icon visually consistent.

**Non-Goals:**

- Change theme selection or persistence, component structure, layout, or localized text.
- Change the sticker-mark geometry, image processing, or the Rust core.

## Decisions

### D1. Map brand colors to semantic roles

Use a burnt Rust orange for `primary` in light and dark themes. Keep `ring` derived from `primary`, so primary actions and keyboard focus indicators share the brand color. Use green for `secondary` and `accent` surfaces, paired with dark green foregrounds in light mode and light green foregrounds in dark mode. The primary remains orange, preserving the design-system rule that the primary must not be confused with a chroma-key background.

Candidate OKLCH values for the main brand tokens are `oklch(0.56 0.14 42)` for light primary and `oklch(0.75 0.12 42)` for dark primary. Green supporting tokens stay near hue 145-148 degrees, with lightness chosen per theme for readable foreground pairs. Final values must pass the existing contrast and gamut checks; document their resulting sRGB equivalents and contrast ratios in `DESIGN.md`.

Alternative: use orange for primary and leave supporting surfaces neutral. Rejected because it would not carry the requested WhatsApp green into the app's semantic palette.

### D2. Keep semantic status colors and neutral surfaces separate

Retain red for `destructive` states. Move the page, card, muted, border, input, checkerboard, and light-theme shadow tokens to warm or subtle green neutrals, avoiding violet remnants without making the content surfaces compete with stickers. Preserve the existing checkerboard contrast constraints.

Alternative: use WhatsApp green for `primary`. Rejected because green backgrounds are supported input to the image tool and the existing design-system contract explicitly keeps primary distinct from chroma-key green.

### D3. Align static browser and install assets

Set the manifest and page `theme-color` to the sRGB equivalent of the light primary token. Update only the existing sticker icon's background and folded-corner colors, preserve its geometry, and regenerate the derived PWA icons from `web/static/icons/icon.svg`.

Alternative: leave the current violet app icon and browser chrome unchanged. Rejected because installed and browser-level surfaces would retain the old brand after the site palette changes.

### D4. Validate semantics, contrast, and rendered surfaces

Extend the contrast tests to assert that primary tokens remain orange and supporting brand tokens remain green in both themes. Keep the existing WCAG contrast, gamut, and checkerboard checks. Add a browser test for the public app and development design showcase, and review the result in the supported locales and both themes. No new UI primitive or dependency is needed; the showcase already renders the shared semantic tokens.

## Risks / Trade-offs

- **Orange can approach the destructive red visually** → keep their hues and semantic roles distinct, retain the red destructive token, and review buttons, alerts, and error states in both themes.
- **Green can resemble a chroma-key sample** → reserve green for supporting surfaces and never use it as the primary or focus color; inspect the main preview with a green-background sample if available.
- **Manifest values cannot use CSS variables** → assert in tests that the static manifest color matches the light primary token's converted sRGB value.
- **Generated icons can drift from their SVG source** → regenerate them in the same change and verify the generated asset set.

## Migration Plan

No stored user data or processing behavior changes. Update the token definitions, static theme color, and icon source together; regenerate and verify the PWA icons; then run the accessibility, design, localization, production-build, and browser tests. Roll back by reverting the token, manifest, icon, documentation, and generated-asset changes as one feature commit. Do not create a release until the existing end-to-end app flow is verified functional.
