## Context

The web client already encodes PNG and WEBP with `OffscreenCanvas`, packages ZIP files with JSZip, and keeps export state in the browser. WhatsApp and Telegram exports have separate contracts; the added choices must not silently change either existing workflow.

## Goals and non-goals

- Add a separate additional static-file export path with bounded format choices.
- Require an explicit background before JPEG encoding and flatten alpha deterministically.
- Support ZIP and TAR.GZ without sending image data over the network or adding a new runtime dependency.
- Keep the existing WhatsApp and Telegram download paths and defaults intact.
- Do not add animation, PDF, server processing, or Telegram API calls.

## Decisions

- Use Canvas `convertToBlob` for JPEG and verify the returned MIME type before packaging. Composite RGBA pixels over the selected background before encoding so transparent areas have defined color.
- Implement a small USTAR writer for static image entries and compress it with the browser `CompressionStream('gzip')` API. Reject unsupported runtime encoders/compression with a recoverable export error.
- Retain JSZip for ZIP output. Validate output extension and MIME at the export boundary rather than trusting browser encoders.
- Keep the new flow separate from WhatsApp pack generation and Telegram's existing PNG/WEBP ZIP flow; do not change their default results.
- Use localized message catalogs for every new control, status, and error in pt-BR, en, and es.

## Risks

- Browser Canvas and Compression Streams support can differ. Feature failures must leave the UI retryable and must not create mislabeled files.
- TAR headers have fixed-width metadata fields. The writer must validate names and lengths and produce deterministic headers.
- JPEG cannot retain alpha, so the UI must make background selection explicit and the encoder must flatten before conversion.

## Validation

Test exact current WhatsApp default archive contents and Telegram PNG/WEBP behavior, alongside ZIP/TAR.GZ signatures, JPEG flattening, format MIME/extension checks, and error recovery. Run Bun web checks, tests, i18n validation, and design lint.
