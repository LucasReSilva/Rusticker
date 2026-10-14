## 1. Ordering primitive

- [x] 1.1 Add pure helpers to reconcile sticker IDs, apply an ID order to sticker objects, and move a sticker by identity without mutating inputs.
- [x] 1.2 Test stable order, unknown and duplicate IDs, invalid moves, same-position moves, and input immutability.

## 2. Editor integration

- [x] 2.1 Store custom order in editor state and reset it on new detection; reconcile it after removal, split, undo, and batch activation.
- [x] 2.2 Render the ordered kept stickers in the grid and send that same order to preview and export while preserving tray-icon identity.
- [x] 2.3 Add pointer drag-and-drop and keyboard reorder controls with focus retention and localized live announcements in all supported locales.

## 3. Validation

- [x] 3.1 Add editor and UI tests for pointer and keyboard ordering, removal/split interactions, detection reset, tray icon, and exported order.
- [x] 3.2 Verify all supported locales, accessibility, relevant web tests, and production build.
