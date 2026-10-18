## Why

The preview and upscale APIs duplicate worker setup, settlement, termination, runtime-error handling, and cancellation. Extracting this lifecycle reduces the chance that the two entry points drift while preserving their existing message behavior.

## What Changes

- Extract the shared worker lifecycle used by the upscaling preview and processing APIs.
- Add focused lifecycle tests for completion, reported errors, runtime errors, cancellation, and cancellation after settlement.
- This change touches `web/` only. It does not change image processing, worker messages, or user-visible behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a behavior-preserving refactor; `skip_specs: true` is set in the change metadata.

## Impact

Affected code is limited to `web/src/lib/upscaling/process.ts`, its focused tests, and a private helper if needed. No dependencies or public APIs change.
