## Context

The editor currently treats detector order as the canonical order. The current parallel implementation work is changing the grid and editor state, so this change starts with a pure ordering utility that can be integrated without modifying those shared files.

## Decisions

- Keep ordering as an ordered list of sticker IDs. IDs preserve identity when stickers are removed or replaced and avoid copying image pixel buffers.
- Reconcile a prior ID order against the current sticker set: discard IDs no longer present and append newly available stickers in their incoming order. A new detection result starts from detector order by resetting the ID order.
- Move an item by stable identity to a requested position, returning a fresh array and leaving the input untouched. Invalid identities and no-op moves do not change the sequence.
- Keep a dedicated ordered ID list in `EditorState`. Reordering updates only that list; removals drop the ID, split replaces its source ID with the candidate IDs in-place, and undo replaces the earliest surviving replacement position with the source ID.
- The UI integration must use the same ordered sticker list for the grid, preview outline order where applicable, tray-icon fallback, and export. Moving a sticker does not change the tray-icon ID.
- Pointer drag/drop is paired with visible, localized move-earlier/move-later buttons and Alt+ArrowUp/Down. Since unmodified grid arrow keys already navigate, the modifier-based command does not conflict with grid navigation. Each successful keyboard move keeps focus on the moved card and announces its new localized position and total.

## Integration seam

The utility in `web/src/lib/tool/sticker-order.ts` exposes reconciliation, reordering, and movement by ID. `EditorState` owns its ordered IDs, resets them when detection replaces the result, reconciles them after split/undo/removal and batch activation, and exposes the ordered kept set. The grid renders that ordered set and calls the move operation on drop or keyboard command; preview and export consume the same ordered set through the existing editor properties. `Grid.svelte` and `state.svelte.ts` are now available for integration. `+page.svelte` remains owned by parallel work, so the parent integration must wire Grid's `onReorder` callback there once that work is complete.

## Risks

- A grid-only order could be lost when export independently reads editor state. Integration must make the editor's ordered kept list the single source for both.
- Split and undo can add or replace IDs. Reconciliation must preserve existing relative order and place new IDs adjacent to their source where the editor applies split semantics; the owning state integration must explicitly handle that case.
- A drag-only interaction would exclude keyboard and assistive-technology users, so keyboard movement and a localized announcement are required before the UI task is complete.
