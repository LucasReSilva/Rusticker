## ADDED Requirements

### Requirement: Shared release footer
Every public page SHALL show a semantic footer after its main content. The footer SHALL display the current application version, a reminder that image processing remains on the user's device, and links to the localized privacy page, the project repository, and its changelog. All footer text and accessible labels SHALL exist in every supported locale. The footer SHALL remain readable and operable with keyboard navigation, at viewport widths of at least 375 pixels, and on pages whose content is shorter than the viewport.

#### Scenario: Version and links on every page
- **WHEN** a user opens any public page in a supported locale
- **THEN** the footer shows the version of the application build and localized text for the privacy reminder and links
- **AND** the privacy link opens the about page in the current locale

#### Scenario: Footer without scripts
- **WHEN** a user opens a prerendered content page with scripts disabled
- **THEN** the footer, version, reminder, and links are present in the page's HTML

#### Scenario: Narrow and short page
- **WHEN** a user opens a short page at a 375-pixel viewport width
- **THEN** the footer remains below the main content without horizontal overflow or overlap
- **AND** its links remain focusable and visibly focused
