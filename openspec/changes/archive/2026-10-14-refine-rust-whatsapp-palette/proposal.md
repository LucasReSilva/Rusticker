## Why

The current orange reads as muted brown in light mode and pastel in dark mode. Issue #90 calls for a clearer Ferris orange identity with recognizable WhatsApp green supporting pack export, while preserving AA contrast during interaction.

## What Changes

- Refine the semantic orange and green palette in `web/`, including the header brand and pack guidance.
- Replace translucent filled-button and linked-badge hover colors with opaque, contrast-checked semantic hover tokens.
- Extend contrast coverage to interaction states and the surfaces carrying focus indicators; update the design guide.
- Out of scope: `core/`, image processing, new messages, logo assets, export behavior, and release work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: Require saturated Ferris orange branding and focus, green pack accents, and AA contrast for filled control hover states.

## Impact

Changes affect `web/src/app.css`, shared buttons and badges, the header, export guidance, PWA browser theme metadata, contrast tests, browser palette checks, and `DESIGN.md`. There are no new dependencies, network requests, or changes to user-image handling.
