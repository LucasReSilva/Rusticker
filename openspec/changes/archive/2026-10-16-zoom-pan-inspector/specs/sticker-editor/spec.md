## ADDED Requirements

### Requirement: Inspect the source image at multiple magnifications
The editor SHALL let users zoom into and out of the original source image and pan across it with pointer, touch, or keyboard while keeping detected sticker boxes aligned with their source-image coordinates. Zoom, pan, and reset controls SHALL have localized accessible names in every supported locale. Zooming or panning SHALL NOT alter detected stickers or the source image.

#### Scenario: Inspect a small detected sticker
- **WHEN** a user zooms into the source preview and pans to a small sticker
- **THEN** the original pixels and the sticker's bounding box remain aligned and can be inspected at a larger displayed size

#### Scenario: Navigate without a pointer
- **WHEN** a keyboard user focuses the source inspector and presses arrow keys
- **THEN** the visible source region pans without altering sticker data

#### Scenario: Navigate by touch
- **WHEN** a touch user zooms with the provided controls and swipes the source inspector
- **THEN** the visible source region pans without losing access to the zoom controls

### Requirement: Adjust crop bounds on the magnified source
In Advanced mode, the crop editor SHALL show the original source image with the selected sticker's crop box. Users SHALL be able to zoom, pan, move the box, and resize it with pointer, touch, and keyboard controls. Dragging and keyboard adjustments SHALL produce integer source-image bounds clamped within the source image; the bounds SHALL remain aligned at every zoom level. The existing numeric controls and apply, reset, and cancel behavior SHALL remain available. All new action labels and instructions SHALL be localized in every supported locale. Image data SHALL remain on the device.

#### Scenario: Adjust a crop while zoomed
- **WHEN** a user zooms into the crop editor and drags a box corner
- **THEN** the draft bounds change by the corresponding source-image pixels while remaining valid, and applying uses the existing crop adjustment behavior

#### Scenario: Adjust a crop using only the keyboard
- **WHEN** a user focuses the move or resize control and presses arrow keys
- **THEN** the draft crop moves or resizes in source-image pixels within valid bounds, and the user can apply it without pointer input

#### Scenario: Reset and cancel visual adjustment
- **WHEN** a user moves or resizes the crop and then resets or cancels
- **THEN** reset restores the detected bounds and cancel leaves the kept sticker unchanged
