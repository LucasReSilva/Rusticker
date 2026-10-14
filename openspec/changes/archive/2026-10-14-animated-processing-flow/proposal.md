## Why

Batch processing exposes individual item states, but the overall flow has no clear visual progress. Users cannot quickly tell how much of a batch has been handled or whether remaining items need attention. A restrained, state-driven presentation can make the flow easier to follow without adding a large animation runtime.

## What Changes

- Show a batch progress summary based on actual completed, failed, and cancelled entries.
- Add subtle entry and completion motion to the processing flow, with a static experience when reduced motion is preferred.
- Localize all new visible and accessible text in every supported locale.
- Keep processing entirely on the device and use existing design-system components and tokens.

Out of scope: Lottie or other animation runtimes, estimated per-image percentages, changes to detection, export, notifications, or the Rust core.

## Capabilities

### Modified Capabilities

- `sticker-editor`: Display truthful, accessible batch progress and honor reduced-motion preferences throughout the processing flow.

## Impact

This change touches `web/` only, plus OpenSpec artifacts. It does not alter image processing, user data storage, network behavior, or exported files.
