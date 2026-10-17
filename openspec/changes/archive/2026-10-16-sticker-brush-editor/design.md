# Design: Sticker Brush Editor

## Overview

The brush editor provides a canvas-based modal/drawer or focused editing view for an individual kept sticker.
It draws on two layers:

- The base source crop (original RGB data from the cropped bounding box).
- The alpha mask (0 for erased transparent background, 255 for opaque sticker pixels).

### Tools and Interactions

- **Mode:** Erase (alpha -> 0) or Restore (alpha -> 255 with source color).
- **Brush Size:** Configurable via slider/keyboard shortcuts (small, medium, large).
- **Canvas Zoom & Pan:** Allows fine detail editing on high-DPI displays and touch devices.
- **History Stack:** In-memory stack of mask changes enabling Undo, Redo, and Reset to detected state.
- **Memory:** Keep at most 20 full-image states in the undo history and create the brush editor only while its dialog is open.
- **Save / Cancel:** Applying updates the sticker's RGBA data in the central `EditorState`. Cancelling discards stroke history.

### Constraints & Invariants

- 100% on-device inside the browser.
- No network telemetry or pixel transfer.
- Output dimensions remain standardized at 512x512 with transparent background.
- Follows design system components and token rules.
