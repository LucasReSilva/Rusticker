## Why

The real detector duplicates the same worker invocation, crash handling, error normalization, and engine recycling lifecycle for detection and split proposals. Extracting that shared lifecycle makes both operations follow one implementation while preserving their current behavior.

## What Changes

- Refactor `web/` to share the worker invocation lifecycle used by detection and split proposals.
- Add regression coverage for split proposal recovery after worker failure.
- Leave Rust core behavior, request construction, scheduling, and user-visible behavior unchanged.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None. This is a behavior-preserving refactor; `skip_specs: true` is set for this change.

## Impact

- Affected code: `web/src/lib/detection/index.ts` and its focused tests.
- No API, dependency, Rust core, or network behavior changes.
