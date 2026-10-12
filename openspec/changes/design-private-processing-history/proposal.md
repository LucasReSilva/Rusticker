## Why

Users cannot tell whether they have already processed an image or revisit a summary after leaving the editor. A local, opt-in history can provide that continuity while preserving Rusticker's promise that user images and derived sticker data never leave the browser.

## What Changes

- Add an optional, browsable processing history stored only in the browser, disabled until the user enables it.
- Record a local SHA-256 fingerprint of the exact selected file bytes and a minimal processing summary; do not retain source images, sticker pixels, or generated packs.
- Provide per-entry deletion, clear-all, bounded retention, and graceful behavior when browser storage is unavailable, evicted, or full.
- Treat fingerprints as sensitive local identifiers, never display or transmit them, and never use them for analytics, synchronization, or network requests.
- Out of scope: cloud backup/sync, restoring an editor session, re-downloading prior packs, storing source/output images, or persistent-storage permission prompts.

## Capabilities

### New Capabilities
- `processing-history`: opt-in local records of completed processing runs, privacy and retention rules, and history management.

### Modified Capabilities
- None.

## Impact

This change affects `web/` only: processing completion flow, a local persistence adapter, settings/history UI, and localized messages. It introduces no server API and no Rust/WASM changes. IndexedDB is the proposed persistence mechanism; browser quota and eviction remain user-agent controlled.
