## Context

The editor currently treats detector order as the canonical order. The current parallel implementation work is changing the grid and editor state, so this change starts with a pure ordering utility that can be integrated without modifying those shared files.

## Decisions

- Keep ordering as an ordered list of sticker IDs. IDs preserve identity when stickers are removed or replaced and avoid copying image pixel buffers.
- Reconcile a prior ID order against the current sticker set: discard IDs no longer present and append newly available stickers in their incoming order. A new detection result starts from detector order by resetting the ID order.
- Move an item by stable identity to a requested position, returning a fresh array and leaving the input untouched. Invalid identities and no-op moves do not change the sequence.
- The UI integration must use the same ordered sticker list for the grid, preview outline order where applicable, tray-icon fallback, and export. Moving a sticker does not change the tray-icon ID.
- Pointer drag/drop is paired with a keyboard move operation and localized announcement. Since grid arrow keys already navigate, the UI should use an explicit modifier-based command such as Alt+ArrowUp/Down, with a visible accessible move control available as a fallback.

## Integration seam

The isolated utility in `web/src/lib/tool/sticker-order.ts` exposes reconciliation, reordering, and movement by ID. The editor state should own its ordered IDs, reset them when detection replaces the result, reconcile them after split/undo/removal, and expose the ordered kept set. The grid should render that ordered set and call the move operation on drop or keyboard command; export should receive the same ordered set. This change intentionally does not edit `Grid.svelte`, `+page.svelte`, `state.svelte.ts`, or export components while those files are being edited by parallel work.

## Risks

- A grid-only order could be lost when export independently reads editor state. Integration must make the editor's ordered kept list the single source for both.
- Split and undo can add or replace IDs. Reconciliation must preserve existing relative order and place new IDs adjacent to their source where the editor applies split semantics; the owning state integration must explicitly handle that case.
- A drag-only interaction would exclude keyboard and assistive-technology users, so keyboard movement and a localized announcement are required before the UI task is complete.
