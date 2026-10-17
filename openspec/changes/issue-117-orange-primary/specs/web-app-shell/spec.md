## ADDED Requirements

### Requirement: Public pages use a coherent responsive layout
Every current public page SHALL use a clear content hierarchy, consistent spacing, and the shared visual system within the application shell. Page content SHALL remain readable and operable across supported locales, light and dark themes, and narrow viewports without horizontal overflow. New public pages, including the planned upscaler page, SHALL use the same shared visual system when introduced.

#### Scenario: Content pages have a clear hierarchy
- **WHEN** a user opens the how-to-use, about, or processing-history page
- **THEN** the page title, supporting content, and grouped sections are visually distinguishable and consistently spaced

#### Scenario: Public page at narrow width
- **WHEN** a user opens a current public page at a 375 CSS pixel viewport
- **THEN** the content fits within the viewport, reading order remains clear, and no horizontal page scrolling is required

#### Scenario: Public page in each theme and locale
- **WHEN** a user opens a public page in any supported locale and either theme
- **THEN** text remains readable, actions remain operable, and the layout accommodates translated content

#### Scenario: New page follows the shared visual system
- **WHEN** the planned upscaler page is added to the public page set
- **THEN** it uses the same shared navigation, spacing, hierarchy, theme tokens, and responsive behavior
