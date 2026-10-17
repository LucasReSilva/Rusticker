## 1. Export format primitives

- [x] 1.1 Add typed image/container format contracts and validate encoder MIME types, extensions, and JPEG background requirements.
- [x] 1.2 Add deterministic USTAR plus gzip archive creation with safe entry-name validation and focused format tests.
- [x] 1.3 Add local static export orchestration for PNG, WEBP, JPEG and ZIP, TAR.GZ, including recoverable typed errors.

## 2. User controls and localization

- [x] 2.1 Add accessible controls for static image format, archive container, and explicit JPEG background choice.
- [x] 2.2 Add localized labels, descriptions, progress, success, and failure messages in pt-BR, en, and es.
- [x] 2.3 Preserve the current WhatsApp default archive and Telegram PNG/WEBP ZIP behavior with regression coverage.

## 3. Verification and documentation

- [x] 3.1 Validate locale-neutral filenames, archive contents, alpha handling, JPEG flattening, and invalid MIME/archive error recovery.
- [x] 3.2 Update architecture documentation and verify Bun checks, tests, i18n, and design lint.
