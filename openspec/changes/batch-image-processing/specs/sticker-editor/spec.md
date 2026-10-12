# sticker-editor Specification Delta

## MODIFIED Requirements

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
