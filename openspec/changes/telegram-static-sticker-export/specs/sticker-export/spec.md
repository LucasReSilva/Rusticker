## ADDED Requirements

### Requirement: Static Telegram sticker-file export

The application SHALL let the user export the current selection of stickers as static PNG or WEBP image files for a user-controlled Telegram import workflow. Each image SHALL preserve transparency and have one dimension exactly 512 pixels and the other dimension no greater than 512 pixels. Export names SHALL be locale-neutral. A ZIP archive MAY group the files, but it SHALL be described only as a collection of static sticker files and SHALL NOT be presented as a native Telegram sticker set or as directly importable by Telegram. The application SHALL provide localized instructions to continue with Telegram's editor or `@Stickers`. Encoding and archive creation SHALL happen locally, and the application SHALL NOT upload images or call Telegram APIs.

#### Scenario: Export transparent PNG files

- **WHEN** the user selects PNG and exports one or more stickers
- **THEN** each output is a transparent PNG with one dimension exactly 512 pixels and the other at most 512 pixels
- **AND** the files use stable, locale-neutral names

#### Scenario: Export transparent WEBP files

- **WHEN** the user selects WEBP and the browser supports WEBP encoding
- **THEN** each output is a transparent WEBP with one dimension exactly 512 pixels and the other at most 512 pixels

#### Scenario: Explain the Telegram handoff

- **WHEN** the Telegram export controls are shown
- **THEN** localized instructions explain that the user must continue in Telegram's editor or with `@Stickers`
- **AND** the ZIP is identified as static image files rather than a native Telegram sticker set

#### Scenario: Keep Telegram processing local

- **WHEN** the user creates a Telegram sticker-file export
- **THEN** encoding and archive creation occur on-device without Telegram API calls or image uploads

#### Scenario: Empty selection

- **WHEN** no stickers are selected
- **THEN** the export action is unavailable

#### Scenario: Export the current batch selection

- **WHEN** the Telegram export controls are shown in the editor
- **THEN** the exporter receives the current combined batch sticker selection
