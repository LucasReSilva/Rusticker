## Why

Rusticker's existing orange and green palette contract needs to read consistently across the product, with orange clearly identifying the brand and primary actions while green supports pack guidance. A shared layout and clearer page hierarchy will make the current public pages easier to scan, while compact sticker actions will leave more room for the artwork.

## What Changes

- Refine the shared theme tokens and visible brand treatment so Rust orange remains the primary color and WhatsApp green stays a supporting accent in light and dark themes.
- Improve the shared navigation and the layouts of the current public content pages for clearer hierarchy, spacing, responsive behavior, and consistency.
- Replace text-heavy sticker-card actions with compact icon controls, localized tooltips, accessible names, visible keyboard focus, touch-sized targets, and an always-available accessible fallback.
- Add Storybook review states for representative public-page layouts and sticker cards before and after the action redesign.
- Keep the planned upscaler page out of this change until its owning image-tools issue is implemented; it must follow the refreshed shared system.
- Avoid source files currently changed by PR #133 while it remains open; integrate any shared-file overlap after that PR merges.
- Touches `web/` only; no Rust core, API, or dependency changes are planned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: Clarify the orange-primary, green-supporting visual hierarchy and consistent responsive shared navigation/layout.
- `web-app-shell`: Require public pages to present consistent, readable responsive page structure within the shared shell.
- `sticker-editor`: Require compact icon-first sticker-card actions with localized hints and usable accessible fallbacks.
- `ui-component-catalog`: Include representative public-page and sticker-card before/after review stories.

## Impact

- Affected areas include `web/src/app.css`, the shared header and public content page components, sticker-card actions, all three Paraglide message catalogs, and Storybook stories.
- No processing behavior, export format, user-image data flow, or page routes change. The existing client-side privacy boundary remains in force.
