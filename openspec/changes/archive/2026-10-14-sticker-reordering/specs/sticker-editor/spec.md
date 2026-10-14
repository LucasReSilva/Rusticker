## MODIFIED Requirements

### Requirement: Stickers shown on a transparency background

The editor SHALL show every kept sticker as a card in the current sticker order, initially matching detection order, rendering the cut-out on the theme's checkerboard so transparent areas are visible in both light and dark themes. Each card SHALL have a localized accessible name that includes its current position. When the export step provides size information for a sticker, its card SHALL show a size badge: a localized placeholder while the size is being measured, the encoded size in kilobytes formatted for the active locale once known (visibly marked, with a localized explanation, when it exceeds the sticker size limit), or a localized "size unavailable" indication if measuring failed. When no size information is provided, no size badge SHALL be shown. In Advanced mode, a kept sticker SHALL offer an accessible control to adjust its crop using source-image pixel bounds. Applying a valid adjustment SHALL update the sticker's source-image bounds and its 512x512 transparent pixels as one result, and the adjusted result SHALL be used by the source preview and export. The adjustment SHALL remain on-device and SHALL NOT re-run segmentation. Bounds SHALL use positive integer width and height and stay within the source image. Empty, non-integer, or out-of-image bounds SHALL be rejected without changing the existing sticker. Adjustment controls, preview alternatives, and validation feedback SHALL be localized in every supported locale.

#### Scenario: Apply adjusted sticker bounds

- **WHEN** the user adjusts a kept sticker to a valid crop and applies it
- **THEN** the editor uses the adjusted source-image bounds and matching transparent sticker pixels in the preview and export

#### Scenario: Crop adjustment is available in Advanced mode

- **WHEN** the user selects Advanced mode
- **THEN** each kept sticker card exposes a localized control to open the crop editor
- **AND** Automatic mode does not expose the manual crop controls

#### Scenario: Cards in detection order

- **WHEN** detection returns stickers
- **THEN** one card per sticker is shown in the same order as the detection result

#### Scenario: No size information

- **WHEN** no size information is provided for a sticker
- **THEN** its card shows no size badge

#### Scenario: Size being measured

- **WHEN** a sticker's size is reported as pending
- **THEN** its size badge shows a localized placeholder instead of a number

#### Scenario: Size known

- **WHEN** a sticker's encoded size is reported as known and within the limit
- **THEN** its badge shows that size in kilobytes, formatted for the active locale

#### Scenario: Size over the limit

- **WHEN** a sticker's encoded size is reported as known and over the limit
- **THEN** its badge shows the size with a distinct warning appearance and a localized accessible explanation

#### Scenario: Size measurement failed

- **WHEN** measuring a sticker's size is reported as failed
- **THEN** its badge shows a localized "size unavailable" indication

#### Scenario: Reject invalid bounds

- **WHEN** an adjustment has an empty size or extends outside the source image
- **THEN** it cannot be applied and the prior bounds and sticker pixels remain unchanged

#### Scenario: Keyboard-accessible adjustment

- **WHEN** the user edits the crop using the keyboard
- **THEN** each bound control is keyboard operable, has a localized accessible name, and the resulting crop can be applied without pointer input

#### Scenario: Adjustment remains local

- **WHEN** the user changes and applies sticker bounds
- **THEN** source pixels and adjusted sticker pixels remain in browser memory and no network request carries image data or data derived from it

#### Scenario: Current positions are announced

- **WHEN** the user changes the sticker order
- **THEN** each card's localized accessible name reflects its new position

## ADDED Requirements

### Requirement: Manually reorder stickers

The editor SHALL let users change the order of kept stickers with pointer drag-and-drop and keyboard-operable move-earlier/move-later controls. Alt+ArrowUp and Alt+ArrowDown on a focused card SHALL provide the same keyboard operation without conflicting with grid navigation. Reordering SHALL change the sequence used by the grid, preview outlines, and exported pack without changing sticker pixels, bounding boxes, removed-sticker state, or tray-icon identity. The initial order SHALL match detection order. Removing a sticker SHALL remove it from the custom order; stickers created by splitting SHALL occupy the source sticker's position in candidate order, and undo SHALL restore the source at the earliest position occupied by its replacements. Re-detection SHALL reset the order to the new detector result. Successful moves SHALL keep focus on the moved card and announce its new position and total in the active locale.

#### Scenario: Move a sticker with pointer

- **WHEN** the user drags a kept sticker card and drops it at another position
- **THEN** the card order and exported sticker order reflect the new position

#### Scenario: Move a sticker with keyboard

- **WHEN** the user invokes the keyboard reorder command on a focused card
- **THEN** the card moves one position in the requested direction, focus remains on that card, and assistive technology receives a localized position announcement

#### Scenario: Move outside the order bounds

- **WHEN** the user requests a keyboard move beyond the first or last position
- **THEN** the order remains unchanged

#### Scenario: Removal and split preserve a valid order

- **WHEN** a sticker is removed, split, or restored by undo
- **THEN** the current order contains each kept sticker exactly once and no removed sticker

#### Scenario: Tray icon remains selected after a move

- **WHEN** the user reorders stickers
- **THEN** the same sticker remains the tray icon

#### Scenario: New detection resets custom order

- **WHEN** a new detection result replaces the previous sticker set
- **THEN** the new result starts in detector order

## MODIFIED Requirements

### Requirement: Kept stickers and tray icon are handed to export

The editor SHALL make the kept stickers, in the user's current order (initially detection order), the identity of the tray-icon sticker, and whether detection is currently in progress available to the export step, and SHALL display per-sticker size information supplied by it. The export step SHALL never receive removed stickers.

#### Scenario: Export sees only kept stickers

- **WHEN** the user has removed two of seventeen detected stickers
- **THEN** the export step receives the fifteen kept stickers in the user's current order and the current tray-icon sticker's identity

#### Scenario: Export knows detection is running

- **WHEN** detection re-runs after a tolerance change
- **THEN** the export step is told that detection is in progress until the new result is available

#### Scenario: Size supplied by export

- **WHEN** the export step supplies the encoded size of a sticker
- **THEN** that sticker's size badge shows the supplied size
