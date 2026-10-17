# Verify WhatsApp Importer Pack Metadata

## Why

The current Rusticker archive exports sticker images and a tray icon but no
pack title or author. A follow-up roadmap issue proposes adding those fields
only if a real importer recognizes a stable metadata contract. WhatsApp's
official sticker-app API and third-party file importers use different
integration paths, so the app and exact version must be identified before
changing Rusticker's archive format.

## What Changes

- Record the evidence for a named third-party `.wastickers` importer contract
  and compare it with WhatsApp's official native integration.
- Preserve the current Rusticker ZIP contract until the importer is exercised
  with a locally generated fixture in a named app/version.
- Record the missing runtime verification as a blocker rather than treating
  source documentation as proof of successful app import.

This is a documentation-only research change. It does not touch `core/` or
`web/`, and it does not implement metadata fields or alter exported files.

## Capabilities

No product behavior changes; this change opts out of spec deltas.

## Impact

OpenSpec research artifacts only. The result gates the dependent pack metadata
feature; no user image or archive is uploaded.
