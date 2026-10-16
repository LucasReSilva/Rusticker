## Context

The editor already initializes its background to RGB (0, 177, 64) and tolerance to 50. Its tolerance slider and background readout live in `Controls.svelte`; users can pick a background from the preview, and split refinement is exposed by sticker cards. This change only reorganizes access to those existing operations.

## Goals / Non-Goals

**Goals:** Add an accessible mode selector; keep Automatic simple; make current tuning and split refinement available in Advanced; leave detection and curation state unchanged when switching.

**Non-Goals:** Add new detection behavior, alter defaults, save mode preference, or change batch scheduling.

## Decisions

- Keep mode selection as transient page-level UI state initialized to `automatic`. It does not belong in persisted/editor processing state because changing mode has no effect on image data or detection output.
- Use the existing design-system toggle/radio primitives and localized catalogs. Avoid a new UI primitive.
- Gate the existing tuning controls and split request actions on `advanced`; keep the background readout and controls together so users can understand the setting they are changing.
- Keep the preview available in both modes. In Automatic, it remains a passive preview; in Advanced, its existing eyedropper interaction is enabled.
- Do not call detection or modify editor state from the mode selector. This guarantees mode changes preserve results and export inputs.

## Risks / Trade-offs

- Hiding the eyedropper in Automatic removes a convenient adjustment for images with non-green backgrounds; the mode description will indicate that Advanced contains manual adjustments.
- Component-local mode state resets on navigation/reload. This is intentional for the initial version and avoids introducing persistence semantics.
