## ADDED Requirements

### Requirement: Printable sheet configuration

The application SHALL provide a separate PDF sheet export with A4 and US Letter paper, portrait and landscape orientation, configurable margins, and configurable spacing between stickers. The resulting PDF pages SHALL use the exact physical dimensions of the selected paper and orientation. All configuration SHALL remain on the user's device.

#### Scenario: A4 portrait

- **WHEN** the user selects A4 in portrait orientation
- **THEN** every PDF page has a physical size of 210 mm by 297 mm

#### Scenario: US Letter landscape

- **WHEN** the user selects US Letter in landscape orientation
- **THEN** every PDF page has a physical size of 279.4 mm by 215.9 mm

#### Scenario: Margins and spacing

- **WHEN** the user sets page margins and sticker spacing
- **THEN** automatic placement observes those values on every page

### Requirement: Automatic sheet layout and pagination

The application SHALL place all selected stickers automatically inside the printable margin rectangle, preserve each sticker's aspect ratio, keep stickers from overlapping, and create as many pages as needed. Sticker order SHALL follow the current selection order.

#### Scenario: Stickers fit on one page

- **WHEN** the selected stickers fit within one page at the configured spacing
- **THEN** they are laid out without overlap inside the page margins on one page

#### Scenario: Stickers require more than one page

- **WHEN** all selected stickers do not fit on one page
- **THEN** the application creates additional pages and places every sticker exactly once

#### Scenario: Aspect ratio is preserved

- **WHEN** a sticker is fitted into an available placement area
- **THEN** its width-to-height ratio is unchanged

### Requirement: Localized preview and manual editing

Before export, the application SHALL show a localized preview of all generated pages and their sticker placements. The user MAY move and resize individual stickers, and each edit SHALL remain within the configured page margins and SHALL NOT overlap another sticker. The interface SHALL provide keyboard-operable alternatives for selecting, moving, and resizing stickers. Every user-visible label, instruction, status, and accessible name SHALL exist in all supported locales.

#### Scenario: Preview multiple pages

- **WHEN** automatic layout produces multiple pages
- **THEN** the preview identifies each page and shows its sticker placements

#### Scenario: Move sticker within margins

- **WHEN** the user moves a sticker in the preview
- **THEN** its new position remains within the printable margin rectangle and does not overlap another sticker

#### Scenario: Resize sticker

- **WHEN** the user resizes a sticker in the preview
- **THEN** the sticker retains its aspect ratio and remains within margins without overlap

#### Scenario: Keyboard edit

- **WHEN** the user selects a sticker and uses the keyboard editing controls
- **THEN** the sticker can be moved and resized without pointer input

#### Scenario: Complete localization

- **WHEN** the user opens the PDF sheet controls in pt-BR, en, or es
- **THEN** every visible and accessible string is translated for the active locale

### Requirement: PDF image quality and privacy

The application SHALL generate the PDF entirely on-device from the current sticker selection. Where the renderer supports alpha, the PDF SHALL preserve sticker transparency. The application MUST NOT send sticker pixels, PDFs, or data derived from them over the network. PDF output SHALL use locale-neutral filenames.

#### Scenario: Transparent sticker

- **WHEN** a selected sticker contains transparent pixels and the PDF renderer supports alpha
- **THEN** those pixels remain transparent in the PDF

#### Scenario: Local generation

- **WHEN** the user previews or exports a PDF sheet
- **THEN** layout and PDF generation happen in the browser without image uploads or other network requests containing user data

#### Scenario: Locale-neutral filename

- **WHEN** the same sheet is exported in any supported locale
- **THEN** its PDF filename is identical across locales
