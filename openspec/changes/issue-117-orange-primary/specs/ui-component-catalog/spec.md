## ADDED Requirements

### Requirement: Product review states are represented in the component catalog
The local component catalog SHALL include representative public-page and sticker-card review stories that show the prior presentation alongside the refreshed presentation. The states SHALL use application theme tokens and support inspection in both light and dark themes. Catalog stories SHALL remain development-only and SHALL NOT enter the production application.

#### Scenario: Compare representative page layouts
- **WHEN** a contributor opens the public-page review stories
- **THEN** representative before and after page-layout states can be inspected side by side

#### Scenario: Compare sticker-card actions
- **WHEN** a contributor opens the sticker-card review stories
- **THEN** the text-heavy prior action presentation and the refreshed icon-first accessible actions can be compared

#### Scenario: Inspect review states in both themes
- **WHEN** a contributor switches the catalog theme
- **THEN** the page and sticker-card review stories render with the corresponding application theme tokens

#### Scenario: Production build excludes review stories
- **WHEN** the production application build completes
- **THEN** the product review stories and catalog tooling are absent from production routes and assets
