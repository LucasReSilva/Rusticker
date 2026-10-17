## 1. Source geometry and candidate state

- [x] 1.1 Add pure source-box validation, source-rectangle extraction, and source-to-preview coordinate helpers; verify invalid, fractional, empty, and edge-aligned boxes in focused unit tests.
- [x] 1.2 Add transactional editor-state operations for manual creation, source-backed bounds updates, removal, and undo/revert; verify candidate pixels, IDs, order, tray icon, split history, and batch snapshots in `bun run test -- src/lib/state.svelte.test.ts`.
- [x] 1.3 Regenerate candidate transparency from the bounded source pixels using current detection options; verify that failed and empty detections preserve the previous editor state.
- [x] 1.4 Validate reviewed split candidates, translate each replacement box into source coordinates, and preserve source order and undo behavior; verify acceptance, discard, malformed proposals, and undo in state tests.

## 2. Full-source editing controls

- [x] 2.1 Add localized controls for candidate creation, selection, move, resize, split review, remove, undo, and revert to all supported message catalogs; verify `bun run i18n:check`.
- [x] 2.2 Extend the source inspector to draw candidate boxes and operate on source coordinates with pointer and touch while zoomed and panned; verify drawing and handle geometry at multiple zoom levels and image edges in focused component tests.
- [x] 2.3 Provide keyboard-operable candidate selection, geometry adjustment, and action controls with localized accessible names and announcements; verify keyboard flows and focus restoration in component tests.
- [x] 2.4 Connect accepted workspace state to cards, previews, tray icon, batch state, and every export path; verify local edit results flow through export controller tests.
- [x] 2.5 Ensure controls and transitions honor reduced motion and responsive layouts; verify with design lint and existing reduced-motion and narrow-viewport coverage.

## 3. Integration and validation

- [ ] 3.1 Add an end-to-end browser flow that adds a missed candidate, adjusts it, reviews and accepts a split, removes a candidate, undoes edits, and verifies preview and exported sticker data stay synchronized.
- [ ] 3.2 Run focused unit/component tests, `bun run check`, `bun run lint`, `bun run lint:design`, `bun run i18n:check`, `bun run test`, `bun run test:e2e`, and strict OpenSpec validation.

The production browser test covers manual add, keyboard movement, removal, undo, source-box synchronization, and export. Split review and acceptance are covered at the editor-state boundary with the exact 512×512 lobe mask accepted by the Rust core. The synthetic source-image split flow did not produce a core proposal after source detection and framing, so task 3.1 remains open pending an end-to-end fixture that preserves the accepted core mask.
