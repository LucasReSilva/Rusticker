## ADDED Requirements

### Requirement: Export actions are prominent in the editor

The editor SHALL display its WhatsApp pack and Telegram static-file export controls before the sticker curation grid in the editor's reading and visual order. The controls SHALL remain within the viewport width on screens at least 375 CSS pixels wide, without horizontal page scrolling.

#### Scenario: Export controls precede sticker curation

- **WHEN** a source image has finished processing
- **THEN** the WhatsApp and Telegram export controls appear before the sticker grid
- **AND** the grid remains available for curation below the export controls

#### Scenario: Editor fits a narrow viewport

- **WHEN** the editor is shown at a viewport width of 375 CSS pixels
- **THEN** export controls, sticker cards, and curation controls fit within the page
- **AND** the document has no horizontal overflow
