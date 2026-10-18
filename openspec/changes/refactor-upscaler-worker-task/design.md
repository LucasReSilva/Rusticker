## Context

See proposal.md - Why. Both public functions in `process.ts` create the same module worker and independently implement terminal settlement and cancellation. Their response protocols differ, so only lifecycle ownership should be shared.

## Goals / Non-Goals

**Goals:** Centralize worker construction, terminal cleanup, and cancellation state while keeping preview and upscale message routing in their current entry points.

**Non-Goals:** Change worker payloads, response protocols, processing logic, callback ordering, logging, error codes, or public function signatures.

## Decisions

Reference: [Extract Method](https://refactoring.guru/extract-method). A private function shares the lifecycle without introducing a class hierarchy or a cross-feature worker framework.

- Use a small typed private lifecycle helper in `process.ts` that supplies the worker and shared cancellation state to each operation. Terminal message handlers continue to settle and terminate as before; the settled flag guards cancellation only. Keep message handlers responsible for interpreting protocol messages. This shares only invariant lifecycle behavior and avoids a generalized message framework.
- Preserve the existing entry point's worker creation timing, distinct diagnostic strings, and callback sequence. Alternative: replace both flows with a generic protocol dispatcher; rejected because it would couple different message types and increase the behavior surface.
- Extend the existing `process.test.ts` fake-worker tests to cover reported and runtime errors plus cancellation after settlement, alongside existing success and cancellation coverage.

## Risks / Trade-offs

- [Cancellation after a terminal message could terminate again] → Preserve the shared settled flag as a cancellation guard and assert post-settlement cancellation is a no-op.
- [A broad abstraction could alter message handling] → Keep dispatch and callbacks local to the two existing functions.
