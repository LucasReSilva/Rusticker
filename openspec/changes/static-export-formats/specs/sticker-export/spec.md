## ADDED Requirements

### Requirement: Optional static image and archive formats

The application SHALL offer an additional static sticker export with PNG, WEBP, or JPEG image files and ZIP or TAR.GZ containers. PNG and WEBP SHALL preserve transparency. JPEG SHALL flatten transparency only after the user explicitly chooses a background color. The selected container and image format SHALL determine validated file extensions and MIME types. Encoding and archive creation SHALL remain local to the browser.

#### Scenario: Export transparent PNG or WEBP

- **WHEN** the user chooses PNG or WEBP for the additional static export
- **THEN** each image preserves the sticker's transparent pixels
- **AND** its extension and MIME type match the selected format

#### Scenario: JPEG requires an explicit background

- **WHEN** the user chooses JPEG without choosing a background
- **THEN** export is blocked and no file is downloaded
- **WHEN** the user chooses JPEG and a background color
- **THEN** transparent pixels are flattened against that color and the output is a JPEG with a `.jpg` extension

#### Scenario: Choose an archive container

- **WHEN** the user chooses ZIP or TAR.GZ
- **THEN** the downloaded archive uses the corresponding `.zip` or `.tar.gz` extension and MIME type
- **AND** the archive contains only the selected static image files with locale-neutral names

#### Scenario: Reject invalid output

- **WHEN** an encoder returns an unsupported MIME type or the archive builder fails
- **THEN** no invalid download is produced and the user receives a localized recoverable error

### Requirement: Existing WhatsApp defaults remain stable

The default WhatsApp export SHALL remain a ZIP named `rusticker-pack-<n>.zip` containing numbered 512x512 WEBP stickers, lossless PNG copies, and a transparent 96x96 PNG tray icon. Existing pack sizing, sticker quality budget, locale-neutral names, and constraints SHALL remain unchanged.

#### Scenario: Default WhatsApp export

- **WHEN** the user exports without changing format settings
- **THEN** the current ZIP, WEBP sticker, PNG copy, tray icon, naming, and pack-size behavior is preserved

### Requirement: Existing Telegram static export remains stable

The Telegram static export SHALL continue to offer transparent PNG or WEBP image files in a ZIP, with its current filenames and localized handoff wording. It SHALL not claim native Telegram-set import.

#### Scenario: Telegram static export defaults

- **WHEN** the user uses the Telegram export controls
- **THEN** PNG and WEBP options produce the existing ZIP of static image files and explain the user-controlled Telegram handoff
