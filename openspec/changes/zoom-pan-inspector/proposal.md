## Why

The source preview cannot be magnified, and the crop editor exposes only numeric sliders. Small or closely spaced stickers are difficult to inspect and adjust accurately, especially on touchscreens.

## What Changes

- Add zoom controls and scrollable panning to the source preview while preserving detected box alignment and eyedropper coordinates.
- Show the original source image inside the crop editor with an overlaid, draggable crop box and resize handles; keep the existing pixel-accurate sliders.
- Provide localized controls and keyboard operation for zoom, panning, moving, and resizing.
- Out of scope: new segmentation, painting/erasing, and changing the export format.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sticker-editor`: Extend source inspection and Advanced crop adjustment with zoom, pan, and interactive crop bounds.

## Impact

This changes `web/` and its message catalogs, tests, and the sticker-editor spec. It does not change `core/`, the worker protocol, or send image data off-device.
