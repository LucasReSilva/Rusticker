## MODIFIED Requirements

### Requirement: Stickers shown on a transparency background

The editor SHALL show every kept sticker as a card in detection order, rendering the cut-out on the theme's checkerboard so transparent areas are visible in both light and dark themes. Each card SHALL have a localized accessible name that includes its position. When the export step provides size information for a sticker, its card SHALL show a size badge: a localized placeholder while the size is being measured, the encoded size in kilobytes formatted for the active locale once known (visibly marked, with a localized explanation, when it exceeds the sticker size limit), or a localized "size unavailable" indication if measuring failed. When no size information is provided, no size badge SHALL be shown. A kept sticker SHALL offer an accessible control to adjust its crop using source-image pixel bounds. Applying a valid adjustment SHALL update the sticker's source-image bounds and its 512x512 transparent pixels as one result, and the adjusted result SHALL be used by the preview and export. The adjustment SHALL remain on-device and SHALL NOT re-run segmentation. Bounds SHALL use positive integer width and height and stay within the source image. Empty, non-integer, or out-of-image bounds SHALL be rejected without changing the existing sticker. Adjustment controls, preview alternatives, and validation feedback SHALL be localized in every supported locale.

#### Scenario: Apply adjusted sticker bounds

- **WHEN** the user adjusts a kept sticker to a valid crop and applies it
- **THEN** the editor uses the adjusted source-image bounds and matching transparent sticker pixels in the preview and export

#### Scenario: Cards in detection order

- **WHEN** detection returns stickers
- **THEN** one card per sticker is shown in the same order as the detection result

#### Scenario: No size information

- **WHEN** no size information is provided for a sticker
- **THEN** its card shows no size badge

#### Scenario: Size being measured

- **WHEN** a sticker's encoded size is reported as pending
- **THEN** its size badge shows a localized placeholder instead of a number

#### Scenario: Size known

- **WHEN** a sticker's encoded size is reported as known and within the limit
- **THEN** its badge shows that size in kilobytes, formatted for the active locale

#### Scenario: Size over the limit

- **WHEN** a sticker's encoded size is reported as known and over the limit
- **THEN** its badge shows the size with a distinct warning appearance and a localized accessible explanation

#### Scenario: Size measurement failed

- **WHEN** measuring a sticker's size is reported as failed
- **THEN** its size badge shows a localized "size unavailable" indication

#### Scenario: Reject invalid bounds

- **WHEN** an adjustment has an empty size or extends outside the source image
- **THEN** it cannot be applied and the prior bounds and sticker pixels remain unchanged

#### Scenario: Keyboard-accessible adjustment

- **WHEN** the user edits the crop using the keyboard
- **THEN** each bound control is keyboard operable, has a localized accessible name, and the resulting crop can be applied without pointer input

#### Scenario: Adjustment remains local

- **WHEN** the user changes and applies sticker bounds
- **THEN** source pixels and adjusted sticker pixels remain in browser memory and no network request carries image data or data derived from it
