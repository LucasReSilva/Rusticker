# sticker-editor Specification

## Purpose
Lets a user turn one image of many stickers into a curated set of cut-out stickers entirely in the browser: load the image, see what was detected, tune the background color and tolerance, remove unwanted stickers, choose the tray icon, and understand any failure in their own language.

## Requirements

### Requirement: Load an image by drop, choice or paste
The tool page SHALL let the user provide one or more images by dragging and dropping files onto the drop area, by activating the area with pointer or keyboard to open the system file chooser, or by pasting an image from the clipboard with Ctrl+V (Cmd+V on macOS) anywhere on the tool page. The drop area SHALL show a distinct visual state while the pointer hovers it and while files are dragged over it. Valid files SHALL be appended to a sequential local batch instead of replacing earlier successful results. The batch SHALL show per-image queued, processing, completed, or recoverable error status; allow retry and removal of an individual image; allow cancellation of queued work and clearing the batch; and preserve successful results when another image fails. The editor SHALL retain at most ten source files and sixty sticker results; files over the source limit SHALL be rejected, and an image whose complete result exceeds remaining sticker capacity SHALL fail as a whole without discarding earlier results. Only one source image SHALL be decoded for processing at a time. Batch results SHALL be combined in file selection order for export, which SHALL explain that each pack contains 3–30 stickers. Image bytes and derived pixels SHALL be read and processed only on the user's device.

#### Scenario: Several images selected or dropped
- **WHEN** the user chooses or drops several files and at least one is an image
- **THEN** valid image files are appended to the batch and processed one at a time, with a visible status for each

#### Scenario: Image dropped on the drop area
- **WHEN** the user drops a PNG, JPEG or WEBP file onto the drop area
- **THEN** the image is queued, shown in the batch, and detection starts automatically

#### Scenario: Image chosen with the keyboard
- **WHEN** the user focuses the drop area with Tab and presses Enter or Space
- **THEN** the system file chooser opens, restricted to image files
- **AND** choosing an image appends it to the batch as if it had been dropped

#### Scenario: Image pasted from the clipboard
- **WHEN** the clipboard contains an image and the user presses Ctrl+V (or Cmd+V) on the tool page
- **THEN** that image is appended to the batch and detection starts automatically

#### Scenario: Dragging state
- **WHEN** the user drags files over the drop area
- **THEN** the drop area shows its dragging state until the files are dropped or the drag leaves the area

#### Scenario: Non-image file rejected
- **WHEN** the user drops, chooses or pastes something that is not an image
- **THEN** no invalid file is queued, existing batch results are kept, and a localized error notification explains that only images are accepted

#### Scenario: Several files dropped at once
- **WHEN** the user drops several files and at least one is an image
- **THEN** all valid image files are queued within the session limit

#### Scenario: Some dropped files are not images
- **WHEN** the user drops a mixture of images and non-image files
- **THEN** image files are queued, non-image files are rejected with a localized error, and no successful result is discarded

#### Scenario: Single image pasted
- **WHEN** the clipboard contains an image and the user presses Ctrl+V (or Cmd+V) on the tool page
- **THEN** the image is appended to the batch and processing starts automatically

#### Scenario: Retry a failed image
- **WHEN** an image cannot be decoded or detected and the user retries its row
- **THEN** only that image is processed again and successful results from other rows remain available

#### Scenario: Remove an image
- **WHEN** the user removes an image from the batch
- **THEN** its sticker results are excluded from the combined editor and export input

#### Scenario: Cancel queued work
- **WHEN** the user cancels while images are queued
- **THEN** pending images stop after the current image finishes and completed results remain available

#### Scenario: Clear the batch
- **WHEN** the user clears the batch
- **THEN** all batch entries, source files, and current image results are released

#### Scenario: Source image limit
- **WHEN** adding an image would exceed the ten-image session limit
- **THEN** the new image is rejected with a localized explanation and existing entries remain unchanged

#### Scenario: Sticker result limit
- **WHEN** an image's complete detection result would exceed the sixty-sticker session limit
- **THEN** that image is marked with a localized recoverable error and none of its partial results are added

#### Scenario: Export grouping
- **WHEN** completed images contain more than thirty stickers in total
- **THEN** export explains the number of generated packs and each pack contains between three and thirty stickers

#### Scenario: No upload
- **WHEN** an image is loaded and processed
- **THEN** no network request carries the image or any data derived from it

#### Scenario: Image cannot be decoded
- **WHEN** a user provides a file that claims to be an image but cannot be decoded
- **THEN** its row shows a localized recoverable error and the user can retry or remove it without losing other results

### Requirement: Detected stickers are outlined on the original image
After a successful detection, the preview SHALL show the original image with one outline per detected sticker, at the position and size of that sticker in the source image, scaled with the image as the preview resizes. A localized, pluralized summary SHALL state how many stickers are currently kept.

#### Scenario: Boxes drawn over the preview
- **WHEN** detection returns stickers for the loaded image
- **THEN** each sticker's bounding box is outlined over the preview at the matching location, in detection order

#### Scenario: Count summary uses plural rules
- **WHEN** one sticker is kept, and later several stickers are kept
- **THEN** the summary uses the singular form for one and the plural form for several, in the active locale, with the number formatted for that locale

#### Scenario: Removed sticker no longer outlined
- **WHEN** the user removes a sticker
- **THEN** its outline disappears from the preview and the count decreases by one

### Requirement: Pick the background color with an eyedropper
The preview SHALL offer an eyedropper mode, with a tooltip explaining it, that sets the background color from a point on the original image. The picked color SHALL be the average of a small neighborhood around the chosen point, so isolated compression noise does not dominate. The eyedropper SHALL be fully operable by keyboard: arrow keys move a visible crosshair over the image, a modifier key moves it in larger steps, Enter or Space picks the color under the crosshair, and Escape leaves the mode without changing the color. Picking a color SHALL immediately re-run detection with the new color. Before any pick, the background color SHALL default to a chroma-key green and the current color SHALL be visible to the user.

#### Scenario: Pick with the pointer
- **WHEN** the user activates the eyedropper and clicks a point on the preview
- **THEN** the background color becomes the color at that point of the original image, the mode ends, and detection re-runs

#### Scenario: Pick with the keyboard
- **WHEN** the user activates the eyedropper with the keyboard, moves the crosshair with the arrow keys and presses Enter
- **THEN** the background color becomes the color under the crosshair and detection re-runs

#### Scenario: Cancel the eyedropper
- **WHEN** the eyedropper is active and the user presses Escape
- **THEN** the mode ends, the background color is unchanged, and focus returns to the eyedropper control

#### Scenario: Crosshair stays inside the image
- **WHEN** the user keeps pressing an arrow key toward an edge of the image
- **THEN** the crosshair stops at the edge

#### Scenario: Eyedropper is explained
- **WHEN** the eyedropper control receives pointer hover or keyboard focus
- **THEN** a localized tooltip explains what it does

#### Scenario: Picked color is announced
- **WHEN** a background color is picked
- **THEN** the new color is shown as a swatch with its hexadecimal code and a localized announcement is made to assistive technologies

### Requirement: Tolerance adjusts detection live
The editor SHALL provide a tolerance control ranging from 0 to 100, defaulting to 50, operable with pointer and keyboard, whose current value is shown as a percentage formatted for the active locale. Changing the tolerance SHALL re-run detection automatically once the user pauses adjusting it, without any extra confirmation, and only the result of the most recent settings SHALL ever be shown.

#### Scenario: Live update after adjusting
- **WHEN** the user moves the tolerance from 50 to 60 and stops adjusting
- **THEN** detection re-runs once with tolerance 60 shortly afterwards, and the preview and grid update with its result

#### Scenario: Rapid changes are coalesced
- **WHEN** the user changes the tolerance several times in quick succession
- **THEN** detection runs only for the last value, and results computed for earlier values are never displayed

#### Scenario: Keyboard adjustment
- **WHEN** the tolerance control has focus and the user presses the arrow keys
- **THEN** the tolerance changes by one step per key press and the displayed percentage updates

### Requirement: Processing feedback
While an image is being decoded or detection is running, the editor SHALL show a progress indicator, mark the affected regions as busy for assistive technologies, and, when no previous result exists, show placeholder cards where stickers will appear. When detection completes, a localized announcement SHALL state the number of stickers detected.

#### Scenario: First detection in progress
- **WHEN** an image was just loaded and detection has not finished
- **THEN** a progress indicator and placeholder cards are shown in place of the sticker grid

#### Scenario: Re-detection in progress
- **WHEN** detection re-runs after a tolerance or color change
- **THEN** the previous result stays visible, marked as busy, with a progress indicator, until the new result replaces it

#### Scenario: Completion announced
- **WHEN** detection finishes successfully
- **THEN** a localized, pluralized message announcing the sticker count is exposed to assistive technologies

### Requirement: Detection failures are shown in the user's language
When detection fails, the editor SHALL show a notification with the localized message for the failure code (`NoStickers`, `ImageTooLarge`, `InvalidInput`, `WorkerFailed`), and a generic localized message for any unknown failure. After a failure the grid SHALL show no stickers, the loaded image SHALL remain in the preview, and the user SHALL be able to change the color or tolerance, or load another image, to try again.

#### Scenario: No stickers found
- **WHEN** detection fails with `NoStickers`
- **THEN** a localized notification explains that no stickers were found, the grid is empty, and the tolerance and eyedropper remain usable

#### Scenario: Image too large
- **WHEN** detection fails with `ImageTooLarge`
- **THEN** a localized notification explains that the image is too large and the user can load another image

#### Scenario: Worker failure recovers
- **WHEN** detection fails with `WorkerFailed` and the user then changes the tolerance
- **THEN** detection is attempted again with the new tolerance

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

### Requirement: Remove a sticker with confirmation
Each sticker card SHALL offer a remove action. Removing SHALL require confirmation in a dialog that names the sticker; cancelling SHALL leave everything unchanged. After removal, keyboard focus SHALL move to the next sticker (or the previous one if the removed sticker was last), or to the grid's heading if none remain. Removed stickers SHALL be excluded from the kept set, from the preview outlines and from export. A new detection result SHALL replace the whole sticker set, so earlier removals do not carry over to it.

#### Scenario: Confirmed removal
- **WHEN** the user activates remove on the third sticker and confirms
- **THEN** the third sticker disappears from the grid and the preview, the count decreases, and focus moves to the sticker that followed it

#### Scenario: Cancelled removal
- **WHEN** the user activates remove and then cancels the dialog or presses Escape
- **THEN** no sticker is removed and focus returns to the remove action

#### Scenario: Removing every sticker
- **WHEN** the user removes the last remaining sticker
- **THEN** the grid shows a localized empty-state message and focus moves to the grid heading

#### Scenario: Re-detection restores the full set
- **WHEN** the user has removed stickers and then changes the tolerance
- **THEN** the grid shows exactly the stickers of the new detection result

### Requirement: Choose the tray-icon sticker
Exactly one kept sticker SHALL be the tray-icon sticker whenever at least one sticker is kept. After each new detection result it SHALL be the first sticker. The user SHALL be able to mark any kept sticker as the tray icon; the chosen card SHALL show a localized tray-icon badge and its control SHALL expose its pressed state. If the tray-icon sticker is removed, the first remaining sticker SHALL become the tray icon.

#### Scenario: Default tray icon
- **WHEN** detection returns stickers
- **THEN** the first sticker is marked as the tray icon

#### Scenario: User chooses another tray icon
- **WHEN** the user marks the fifth sticker as tray icon
- **THEN** the fifth card shows the tray-icon badge, its control reports pressed, and no other card does

#### Scenario: Tray-icon sticker removed
- **WHEN** the user removes the sticker that is the tray icon
- **THEN** the first remaining sticker becomes the tray icon

### Requirement: Keyboard navigation of the sticker grid
The sticker grid SHALL be a single Tab stop: Tab enters it on the most recently focused card (initially the first), and Tab again moves into that card's actions and then out of the grid. Within the grid, Left and Right arrows SHALL move focus to the previous and next card, Up and Down arrows SHALL move by one visual row according to the current layout, Home and End SHALL move to the first and last card, and Delete or Backspace SHALL start removal of the focused card. Focus SHALL always be visible.

#### Scenario: Arrow navigation
- **WHEN** the first card has focus and the user presses Right Arrow twice
- **THEN** focus is on the third card

#### Scenario: Row navigation follows the layout
- **WHEN** the grid shows four cards per row, the second card has focus, and the user presses Down Arrow
- **THEN** focus moves to the sixth card

#### Scenario: Home and End
- **WHEN** a card in the middle has focus and the user presses End, then Home
- **THEN** focus moves to the last card, then to the first card

#### Scenario: Single tab stop
- **WHEN** the user tabs into the grid, focuses the fourth card with the arrows, tabs away and later tabs back
- **THEN** focus returns to the fourth card

#### Scenario: Delete key starts removal
- **WHEN** a card has focus and the user presses Delete
- **THEN** the removal confirmation dialog opens for that card

### Requirement: Localized, accessible and responsive editor
Every piece of text the editor shows or exposes to assistive technologies (labels, accessible names, image alternative texts, tooltips, announcements, notifications, counts) SHALL exist in every supported locale, and the editor SHALL be available on the tool page of every locale. Numbers, sizes and percentages SHALL be formatted for the active locale. The layout SHALL work from narrow mobile screens upward, SHALL not overflow or hide meaningful text when labels are longer than in the base locale, and SHALL honor a reduced-motion preference.

#### Scenario: Editor in each locale
- **WHEN** the user opens the tool page in any supported locale
- **THEN** all editor text appears in that locale

#### Scenario: Locale-aware numbers
- **WHEN** a size of 1234.5 kilobytes or a tolerance of 50% is shown
- **THEN** it uses the active locale's digit grouping, decimal separator and percent format

#### Scenario: Narrow screen
- **WHEN** the tool page is shown on a narrow mobile viewport
- **THEN** the drop area, preview, controls and grid stack vertically without horizontal scrolling

#### Scenario: Long labels
- **WHEN** a locale's labels are substantially longer than the base locale's
- **THEN** labels wrap instead of overflowing or being truncated

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** state changes in the editor happen without non-essential animation

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

### Requirement: Editor state survives a language switch
Switching the interface language on the tool page SHALL NOT reload the page and SHALL keep the loaded image, the detected stickers, removals, the tray-icon choice, the tolerance and the background color; only the text changes to the new locale.

#### Scenario: Switch language after curating
- **WHEN** the user has loaded an image, removed two stickers, chosen the fourth sticker as tray icon, and then switches the language from pt-BR to en
- **THEN** the tool page shows the same image, the same kept stickers and the same tray-icon choice, with all editor text in English

#### Scenario: Switch language during detection
- **WHEN** detection is running and the user switches the language
- **THEN** detection completes and its result is shown in the new language without the user loading the image again

### Requirement: Processing modes
The tool page SHALL provide Automatic and Advanced processing modes, with Automatic selected by default. Automatic mode SHALL use the existing default background color of RGB (0, 177, 64) and tolerance 50 without requiring configuration. It SHALL explain that these are the default detection settings. Advanced mode SHALL expose the existing tolerance control, background color readout and eyedropper, and manual split-refinement actions. Mode controls and explanatory text SHALL be available in every supported locale and operable with keyboard and assistive technology. Switching modes SHALL preserve the loaded image, detected stickers, removals, tray-icon choice, current background and tolerance, and export state; a mode change alone SHALL NOT re-run detection or alter results.

#### Scenario: Start in automatic mode
- **WHEN** a user opens the tool page
- **THEN** Automatic is selected, existing default settings are used, and advanced tuning controls are hidden

#### Scenario: Change to advanced mode
- **WHEN** the user selects Advanced
- **THEN** existing background and tolerance controls and manual split-refinement actions become available without changing the current image or sticker results

#### Scenario: Return to automatic mode
- **WHEN** the user switches to Automatic after tuning or curating stickers
- **THEN** the current settings, image, sticker results, curation, tray icon, and export state remain intact, while advanced controls are hidden

#### Scenario: Select a mode by keyboard
- **WHEN** the mode selector has keyboard focus
- **THEN** the user can select either mode and assistive technology can determine the selected mode

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

### Requirement: Batch processing progress is understandable
The editor SHALL show the number of batch images whose processing has ended out of the total, using actual image states rather than an estimated per-image percentage. It SHALL distinguish successful results from items needing attention, and SHALL expose the progress in every supported locale to sighted users and assistive technology users. The progress presentation SHALL not block retry, cancellation, or editing, and SHALL disappear when the batch is cleared.

#### Scenario: Batch starts
- **WHEN** images are added to an empty batch
- **THEN** the progress presentation shows the total image count and zero completed images until processing actually ends for an item

#### Scenario: Batch advances
- **WHEN** an image finishes processing
- **THEN** the completed count and progress indicator advance to match the number of images whose processing has ended

#### Scenario: Batch needs attention
- **WHEN** processing fails or is cancelled for an image
- **THEN** that image counts as handled, while the presentation does not describe it as a successful result

#### Scenario: Batch is cleared
- **WHEN** the user clears the batch
- **THEN** the progress presentation disappears

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** all batch states remain readable without non-essential animation
