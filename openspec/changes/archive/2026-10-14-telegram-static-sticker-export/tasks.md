## 1. Contract and export module

- [x] 1.1 Add the Telegram static-file export behavior contract to `sticker-export`.
- [x] 1.2 Implement deterministic locale-neutral archive and entry names, PNG/WEBP selection, progress reporting, and recoverable failures in an isolated module.
- [x] 1.3 Test image encoding choices, archive contents, ordering, empty input, and failure handling.

## 2. Localized UI

- [x] 2.1 Add a standalone Telegram export component with format selection, progress, localized Telegram editor/`@Stickers` handoff instructions, and safe ZIP labeling.
- [x] 2.2 Add all user-visible strings to pt-BR, en, and es catalogs and validate localization.
- [x] 2.3 Integrate `<TelegramExport>` into the tool page with the current batch sticker selection and verify the route exposes its format controls.

## 3. Verification

- [x] 3.1 Run focused export tests, web checks, localization checks, and the appropriate build/design checks.
- [x] 3.2 Validate the OpenSpec change and the integrated tool page.
