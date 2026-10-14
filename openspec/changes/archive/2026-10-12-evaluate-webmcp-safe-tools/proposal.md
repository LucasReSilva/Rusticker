# Evaluate WebMCP feasibility and safe Rusticker actions

## Why

The roadmap asks whether Rusticker can support WebMCP without changing its client-side privacy guarantee. The API and browser support are evolving, and exposing page actions to agents introduces a new boundary around user-selected images and generated sticker packs.

## What changes

- Evaluate the current primary specification and browser documentation.
- Record compatibility, privacy and security limits, a minimal safe tool surface, and implementation gates for issue #51.
- Keep the report and architecture documentation explicit that this is a recommendation, not shipped behavior.

## Out of scope

- Registering tools or implementing an agent integration.
- Sending image data, sticker content, or image-derived metadata to any agent or service.
- Changing upload, processing, editor, or export behavior.
