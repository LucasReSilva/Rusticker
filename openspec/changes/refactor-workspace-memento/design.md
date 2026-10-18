## Context

See proposal.md for motivation. `EditorState` owns the reactive workspace fields and the reactive undo stack. Snapshot restoration also resets transient split proposal state and synchronizes the active batch.

## Goals / Non-Goals

**Goals:** Make snapshot copying and bounded stack operations explicit while retaining editor ownership of reactivity and restored state.

**Non-Goals:** Moving history into a non-reactive service, changing what edits are undoable, or changing batch, split, brush, or detection behavior.

## Decisions

Reference: [Memento](https://refactoring.guru/design-patterns/memento). The editor remains responsible for providing and restoring its state, while focused helpers copy snapshot containers and manage bounded history.

- Use small pure functions in a focused workspace-history module to create snapshot values and append/pop bounded history. Keep `workspaceUndo` as `EditorState`'s `$state.raw` array so existing UI reads remain reactive.
- Replace the stack through assignment after pop so the reactive undo-control availability reliably observes transitions after both save and undo; source and detection resets continue assigning an empty stack.
- Keep snapshot application in `EditorState`: it knows how to restore `SvelteSet`/`SvelteMap`, clear transient proposals, and synchronize the active batch. This avoids hiding editor side effects inside a generic caretaker.
- Preserve shallow `Sticker`/`ImageData` references while copying collection containers, matching current semantics. A history class or generic command framework would add ownership and reactivity complexity without improving this narrow policy boundary.

## Risks / Trade-offs

- [A snapshot field is omitted during extraction] → Keep the snapshot shape centralized and test restore of order, split undo, and brush reset metadata alongside existing undo cases.
- [History becomes invisible to reactive consumers] → Keep the stack in `$state.raw` on `EditorState`; helper operations return replacement arrays assigned to that field, and cover undo-control transitions with an effect regression.

## Migration Plan

Popping history returns a replacement array assigned to `$state.raw`. This also corrects reactive notification when the final snapshot is consumed: an observer of `canUndoWorkspaceEdit` sees the stack become empty. The regression test checks this existing undo-control contract without depending on duplicate effect executions.

No migration is needed. Replace the inline capture and stack operations without changing editor state lifecycle.
