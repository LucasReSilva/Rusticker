## Context

Rusticker already keeps detected sticker pixels in browser memory and has separate export flows for WhatsApp, Telegram, and general static image files. A PDF sheet is a new print workflow with physical page dimensions, a preview, optional per-sticker edits, and multiple pages. It must remain independent from the current exports.

## Goals and non-goals

- Generate a downloadable PDF entirely in the browser with exact A4 or US Letter dimensions.
- Support portrait and landscape pages, configurable margins and spacing, automatic pagination, and optional manual placement edits.
- Keep every sticker within the printable area and preserve its aspect ratio.
- Preserve transparency when supported by the PDF renderer; never silently flatten it to an arbitrary background.
- Keep the existing WhatsApp, Telegram, and static file exports unchanged.
- Do not add server processing, uploads, or any network calls containing user data.

## Decisions

- Model sheet settings and each sticker's page, position, and size as serializable local state. Generate a default non-overlapping layout whenever stickers or page settings change; retain a user's manual edits until a layout-affecting setting changes.
- Express paper dimensions and placement in millimeters in the UI/model, and convert to PDF points only at the renderer boundary (`72 / 25.4` points per millimeter). A4 is 210 x 297 mm; US Letter is 215.9 x 279.4 mm. Orientation swaps width and height.
- Use a deterministic row/shelf placement algorithm that fits each image into the available page area, keeps aspect ratio, applies the requested spacing, rejects overlap, and starts another page when no remaining row fits.
- Constrain pointer movement and button/keyboard movement and resize operations to the margin rectangle and prevent collisions with other stickers. Provide keyboard-operable controls so edits do not require a pointer.
- Use a browser-side PDF renderer. Embed sticker PNG data with its alpha channel where supported. Validate output page dimensions and transparent image embedding in focused tests.
- Expose the preview as an accessible page list and canvas-like editing surface with localized page counts and labels. Provide explicit controls for selecting a sticker, moving it, and resizing it; the visual surface alone is not the only control path.
- Use a canvas for the page preview because it maps the millimeter layout and pointer hit-testing to a single paper-sized surface. Use the existing design-system buttons for every setting and for keyboard-operable sticker selection and edits.
- Add the feature as a separate export section, without changing the existing export controllers or their file contents.

## Risks

- PDF libraries and browser image APIs may handle alpha differently; tests must inspect the generated PDF structure and rendered pixels where practical.
- Dense sheets can create many pages and large documents. Layout and generation should process stickers sequentially and avoid retaining duplicate encoded images unnecessarily.
- Drag/resize state can become stale after detection changes; preview state must be derived from the current sticker identities and reset when that set changes.
- Exact page dimensions depend on consistent unit conversion and orientation handling.

## Validation

Run focused layout and PDF generation tests, Svelte type checks, i18n catalog validation, design lint, and the web test suite. Confirm current WhatsApp, Telegram, and static export regression tests still pass. Inspect the PDF page boxes for both paper sizes and orientations, and verify transparent source pixels remain transparent in the embedded/rendered result where supported.
