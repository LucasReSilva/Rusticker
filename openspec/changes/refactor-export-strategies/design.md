## Context

See proposal.md for motivation. Static and Telegram exporters use the same PNG and fixed-quality WEBP operations but have distinct naming, progress, and error policies. WhatsApp export compares ordered sticker IDs, pixel references, and tray selection in two places.

## Goals / Non-Goals

**Goals:** isolate encoding variants and share input identity rules while preserving existing caller contracts.

**Non-Goals:** introduce a class hierarchy, merge product-specific export workflows, deep-copy image buffers, or add persistent history.

## Decisions

### Use functional Strategy objects for image encoding

Following [Refactoring Guru's Strategy pattern](https://refactoring.guru/design-patterns/strategy), expose a common `mimeType` and `encode(pixels)` interface. Create PNG and WEBP strategies around the injected encoder; static export adds its JPEG strategy after the existing explicit-background validation. Each exporter selects once before iterating. Preserve WEBP quality 0.9, encoder method receivers, input pixel references, and caller-specific MIME error handling.

Functions and small objects fit the existing dependency-injection style. Classes would add construction and inheritance without useful state. Archive selection stays as-is because its two branches do not repeat across exporters; WhatsApp retains its budget-aware encoding path.

### Share a capture-and-match input utility

Capture a shallow copy of the sticker records and the tray ID. Use a single comparison function in controller and session, comparing ordered IDs and pixel references. Snapshot creation must read these properties synchronously so Svelte effects retain dependency tracking. The controller keeps its existing lifetime and invalidation logic; the session keeps its public get/set/clear API.

This is an identity snapshot, not undo/redo: no Memento lifecycle is needed. Pixel bytes are not cloned and must continue to be replaced rather than mutated in place. Comparing whole sticker objects would incorrectly invalidate harmless record replacements; comparing IDs alone would miss pixel changes.

## Risks / Trade-offs

- [Changed error behavior] → Retain validation and error translation in each exporter; test fallback MIME values and encoder rejection.
- [Lost reactive invalidation or stale downloads] → Read snapshot fields inside the effect and retain cancellation tests, including input reorder and mutation during encoding.
- [Mutable input records] → Copy records during capture and directly test cache invalidation after source mutation.
- [Privacy] → Helpers operate only on browser-local references. No new storage, networking, UI primitives, or user-facing text.

## Migration Plan

No data migration or dependency installation is required. Existing exports remain the integration points. Reverting the refactor restores the previous internals without changing callers or persisted data.
