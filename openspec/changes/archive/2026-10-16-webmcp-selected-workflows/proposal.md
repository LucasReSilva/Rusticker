# Expose reviewed Rusticker workflows through WebMCP

## Why

Issue #50 approved a conditional, feature-detected WebMCP enhancement with a deliberately small tool surface. Rusticker can expose a way to open the existing image picker and a coarse editor status while keeping the user's image and image-derived data outside the tool boundary.

## What changes

- Add an isolated imperative adapter for the current `document.modelContext` API.
- Register only `open-image-picker` and read-only `get-editor-status`, with localized metadata, empty input schemas, bounded results, strict runtime validation, and lifecycle cleanup.
- Keep unsupported browsers and registration failures on the existing fully functional UI path.
- Document the implemented surface, integration boundary, and privacy constraints.

## Out of scope

- Starting detection, editing stickers, changing settings, deleting history, or exporting/downloading packs through WebMCP.
- Sending image bytes, pixels, names, hashes, sticker crops, or content-derived metadata to a tool or remote service.
- Cross-origin exposure, third-party frames, or a required browser/API baseline.
