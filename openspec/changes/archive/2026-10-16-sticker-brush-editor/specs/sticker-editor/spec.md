## ADDED Requirements

### Requirement: Erase and restore sticker pixels with a brush

In Advanced mode, the editor SHALL offer a brush tool for each kept sticker that lets the user erase pixels to transparent or restore original source pixels within the sticker crop. The tool SHALL provide brush size adjustment, zoom/pan controls, undo and redo of stroke operations, and a reset action to restore the detected cutout. Applied edits SHALL update the sticker image, checkerboard card preview, and exported pack. Reset SHALL restore the detected cutout even after an edit has been applied and the brush editor reopened. All pixel manipulation SHALL be performed locally in browser memory without sending data over any network.

#### Scenario: Erase pixels

- **WHEN** the user strokes with the erase brush over opaque sticker pixels
- **THEN** the brushed pixels become transparent

#### Scenario: Restore pixels

- **WHEN** the user strokes with the restore brush over transparent areas within the sticker crop
- **THEN** the original source image pixels and opacity are restored

#### Scenario: Undo and reset

- **WHEN** the user triggers undo or reset in the brush editor
- **THEN** previous stroke states are restored or all manual brush edits are cleared back to the detected state

#### Scenario: Applied edits reflect in preview and export

- **WHEN** the user applies brush adjustments
- **THEN** the updated sticker pixels are used in the checkerboard card preview and export pack

#### Scenario: Reset after reopening

- **WHEN** the user applies brush adjustments, reopens the brush editor, and resets
- **THEN** the detected cutout is restored and can be applied again

#### Scenario: Local processing

- **WHEN** brush editing is performed
- **THEN** all canvas operations remain on-device and no network requests are dispatched
