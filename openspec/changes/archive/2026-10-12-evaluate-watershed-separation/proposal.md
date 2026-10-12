## Why

The current 8-connected component detector intentionally returns touching foreground as one sticker. Evaluate whether marker-controlled watershed can separate synthetic touching stickers without splitting plausible single stickers, before considering any product behavior change.

## What Changes

- Add deterministic, code-generated binary shape fixtures for touching, close-but-separated, noisy, and ambiguous forms; no image fixtures or private samples are committed.
- Compare the current 8-connected component result with a test-only distance-transform and watershed candidate using missed-split, false-split, region-count, and foreground-coverage observations.
- Record a go/no-go recommendation, limitations, and a proposed user-review gate for any future implementation.
- This issue may touch `core/tests/` and evaluation documentation only. Production detection behavior and `web/` remain unchanged.
- Out of scope: adding a watershed implementation to the runtime, changing the OpenSpec detection contract, new dependencies, using private images, and any release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an offline evaluation and does not change observable product behavior. `.openspec.yaml` sets `skip_specs: true`.

## Impact

- `core/tests/` may host a deterministic evaluation harness that reuses the existing `imageproc` dependency without changing runtime code.
- Documentation will record algorithm, synthetic results, resource implications, and a recommendation.
- No WebAssembly or frontend behavior, API, dependency, privacy boundary, or release changes.
