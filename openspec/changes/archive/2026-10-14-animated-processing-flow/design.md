## Context

See [proposal.md](proposal.md). The editor already tracks each batch item's queued, processing, done, error, or cancelled state. Its queue and notifications remain the source of item actions and announcements.

## Goals / Non-Goals

**Goals:** Derive truthful aggregate progress from existing state, provide a compact visual focus for processing, and retain full accessibility across motion preferences.

**Non-Goals:** Per-image percent estimates, animation downloads, or changes to the worker and Rust core.

## Decisions

- Count `done`, `error`, and `cancelled` items as handled. Show success and attention counts separately so a full bar never implies every image succeeded. This uses existing state and remains accurate when items are retried or removed. An estimated timer was considered but would present invented progress.
- Reuse the design-system Card and Progress primitives, theme tokens, localized messages, and Svelte's state-driven rendering. A Lottie player was considered; its extra runtime and assets offer little value for this small state transition and would complicate offline delivery. No new UI primitive is needed.
- Animate only decorative transitions with `motion-safe` utilities. Existing queue and notification semantics remain responsible for status announcements. Do not create a second live region that could announce each state twice.
- Compute progress entirely in the browser from metadata already held by the editor. No image bytes, hashes, or other user data are sent off-device.

## Risks / Trade-offs

- [A full bar with failed items could look like success] → Show success and attention counts adjacent to the indicator.
- [Animation could distract or cause discomfort] → Disable decorative motion under reduced-motion preference and preserve text states.
- [Rapid batch updates could create noisy announcements] → Use the existing queue status and notifications for live announcements; make the aggregate indicator accessible on demand.

## Migration Plan

This is an additive web UI change. Deploy with the normal static build; rollback by reverting this change.
