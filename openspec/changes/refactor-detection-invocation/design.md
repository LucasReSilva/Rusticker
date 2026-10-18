## Context

Reference: [Extract Method](https://refactoring.guru/extract-method). This change uses a private shared function rather than introducing a class hierarchy for the existing worker lifecycle.

See proposal.md for motivation. `createDetector` currently has separate async closures for detection and split proposals. Each creates an engine on demand, races a Comlink request against that engine's crash promise, converts thrown values to `WorkerFailed`, and recycles the failed engine. The closures also construct distinct request types and make independent copies of caller pixel data.

## Goals / Non-Goals

**Goals:** Centralize the shared worker call and recovery lifecycle while keeping operation-specific request construction explicit.

**Non-Goals:** Change runtime scheduling, worker startup/disposal timing, transfer behavior, detection or split results, or public APIs.

## Decisions

- Add a small private engine accessor and one private invocation helper inside `createDetector`. Each operation obtains the engine, prepares its request and defensive copy, then passes that captured engine and a Comlink-call callback to the invocation helper. The helper owns crash racing, thrown-value conversion, and recycling.
- Keep `execute` and `propose` responsible for copying their own pixel buffers, constructing their distinct request types, and invoking `detect` or `split` respectively. This keeps their payload contracts explicit and preserves one defensive copy per call.
- Reuse the existing `recycle` function unchanged, including its identity check before clearing the current engine. An alternative was to merge request construction into the helper, but this would obscure operation-specific fields and types without reducing meaningful lifecycle duplication.
- Extend the fake-worker regression test to cover split failure followed by success on a fresh worker, transport rejection normalization and recovery, and reuse after a core-coded failure. Existing detect tests continue to cover image preservation, crash recovery, and disposal.

## Risks / Trade-offs

- [The helper could accidentally change which engine is recycled after overlapping outcomes] → Capture one engine for each invocation and pass that same instance to the operation callback and existing recycle function.
- [Request preparation could move inside the transport error boundary] → Keep engine acquisition, pixel copying, and request construction in each caller before invoking the helper, matching the current exception boundary.
- [A request could transfer the caller's original pixels] → Keep `slice().buffer` in both operation closures and assert caller image integrity in focused tests.

## Migration Plan

No migration is needed. Revert the private helper and its test changes to roll back.
