## Why

New sticker cards currently appear at once after detection, which makes the result grid feel abrupt. A restrained fade can clarify that previews have arrived while preserving the editor's existing layout and its support for reduced motion.

## What Changes

- Add a lightweight fade-in when sticker previews first render in the editor.
- Keep each preview's layout space stable while the effect runs.
- Render previews immediately when reduced motion is preferred.
- Keep the behavior CSS-driven and local to the web UI; no animation dependency or network asset is needed.

This change touches `web/` only. It does not change sticker processing, loading placeholders, image handling, or export behavior.

## Capabilities

### Modified Capabilities
- `sticker-editor`: define preview entry behavior and reduced-motion handling.

## Impact

The change affects sticker card preview presentation and its focused web tests. It introduces no dependency, user-facing text, or network request.
