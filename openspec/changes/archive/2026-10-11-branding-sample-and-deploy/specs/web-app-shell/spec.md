## MODIFIED Requirements

### Requirement: Shared navigation header
Every page SHALL show a header with the official application logo, app name, and links to the tool page, the how-to-use page, and the about page. Each link SHALL point to that page in the active locale.

#### Scenario: Navigation keeps the locale
- **WHEN** a user on the English about page activates the how-to-use link in the header
- **THEN** the English how-to-use page opens

#### Scenario: Header on every page
- **WHEN** a user opens any of the three pages in any supported locale
- **THEN** the header with the official logo and navigation links is present

