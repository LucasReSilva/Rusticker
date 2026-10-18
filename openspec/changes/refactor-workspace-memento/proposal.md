## Why

Workspace undo state is captured and restored directly inside the broad editor state coordinator, making the set of undoable fields and history policy easy to let drift. A narrow memento helper can make this policy explicit while preserving the editor's current behavior.

## What Changes

- Extract workspace snapshot creation and bounded history operations into a small helper while keeping reactive ownership and restoration in `EditorState`.
- Preserve the 20-entry limit, shallow sticker and pixel references, copied collections, split and brush reset metadata, transient preview resets, and active batch synchronization.
- Assign replacement history arrays when snapshots are consumed so the undo control reacts when history becomes empty; cover this existing undo behavior with an effect-based regression.
- Out of scope: new user-facing features, redo, persistence, detection, exports, Rust, and changes to editor requirements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a behavior-preserving implementation refactor.

## Impact

Touches `web/` editor state and focused tests, plus this OpenSpec change. No API, dependency, privacy, or feature changes. Consuming a snapshot now explicitly notifies reactive undo-control observers instead of mutating a raw state array in place.
