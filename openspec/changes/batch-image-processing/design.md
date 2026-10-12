# Design: Batch image processing

The editor owns a bounded batch queue while retaining one active source image in decoded form. Queue entries keep the original `File`, a stable session id, a status, a recoverable error code, and successful sticker pixel results. Only one entry is decoded and sent to the existing detector at a time. Once processed, the full source `ImageData` is released when another file becomes active; sticker results remain available for curation and export.

The queue is capped at ten source files and sixty retained sticker results. If an image's full result would exceed the remaining sticker capacity, that image is marked with a localized capacity error and contributes no partial result. The user can remove completed entries and retry the failed image. Reprocessing an existing entry replaces only that entry's result.

The existing editor remains the active-image editor. Selecting a completed row reloads and re-detects its retained local `File`, so current color/tolerance and curation controls continue to apply. A route-level synchronization copies active curation changes back to that entry. The batch export input is the ordered concatenation of completed entries; the existing export splitter explains that each output pack contains 3–30 stickers. The chosen tray icon is the active entry's choice if present, otherwise the first retained sticker.

Queue scheduling is sequential. Cancellation stops pending work after the current detector request settles; clearing removes all entries and invalidates the active editor result. Failed decode or detection affects only its entry. Unsupported files are rejected without dropping valid files in the same selection.

No image data or derived pixel data is sent over the network. Batch import does not choose automatic/advanced processing behavior; that remains issue #46.
