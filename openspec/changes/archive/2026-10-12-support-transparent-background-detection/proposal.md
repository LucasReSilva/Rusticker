## Why

The archived diagnostic documented that the core ignores source alpha and that HSV hue comparisons can erase colored stickers on an achromatic background at zero tolerance. Implementing the already-approved `sticker-detection` contract makes transparent inputs and exact-color uniform backgrounds reliable while retaining the existing nonzero HSV chroma-key behavior.

## What Changes

- Exclude fully transparent source pixels from foreground classification regardless of their hidden RGB values.
- Combine source opacity with the existing component-edge coverage when creating sticker pixels.
- At zero tolerance, classify background by exact RGB equality; retain the existing HSV thresholds for nonzero tolerances.
- Add deterministic synthetic tests for transparent, partially transparent, achromatic, chromatic non-green, and green-screen cases.
- Keep Web UI behavior, dependencies, and non-uniform-background segmentation out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `sticker-detection` behavior contract was synced and archived by the diagnostic change; this change implements that existing contract.

## Impact

- `core/` Rust detection mask, background classifier, alpha extraction, and synthetic tests.
- No API, `web/`, dependency, or localization changes.
- `.openspec.yaml` sets `skip_specs: true` because this change adds no behavior beyond the already-synced contract.
