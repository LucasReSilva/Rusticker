## MODIFIED Requirements

### Requirement: Brand colors meet AA contrast in both themes
The app SHALL use saturated Ferris-inspired Rust orange as the dominant brand color for identity, primary actions, and keyboard focus indicators. WhatsApp-inspired green SHALL be a supporting color reserved for pack guidance and secondary pack-download actions; it MUST NOT dominate a page, header, or primary action. Orange MUST remain distinct from green chroma-key backgrounds. In both the light and dark theme, every text color token MUST have a contrast ratio of at least 4.5:1 against each background token it is designed to sit on, including enabled filled controls in their resting and hover states. Focus indicators and input borders MUST have at least 3:1 against their adjacent intended surfaces, and the primary color used as a non-text indicator MUST have at least 3:1 against the page background. An automated check MUST verify these pairs and fail when any falls below its threshold.

#### Scenario: Rust orange is the primary brand color
- **WHEN** the light or dark theme is active on any current public page
- **THEN** the app identity, primary actions, and keyboard focus indicators use saturated orange, while green appears only as a supporting accent for pack guidance and secondary pack-download actions

#### Scenario: Primary button text in light theme
- **WHEN** the contrast check evaluates the primary foreground on the primary color in the light theme
- **THEN** the ratio is at least 4.5:1

#### Scenario: Filled control is hovered
- **WHEN** an enabled primary, secondary, or destructive button or linked badge is hovered in either theme
- **THEN** its text maintains at least 4.5:1 contrast against its hover surface

#### Scenario: Green accents remain legible in both themes
- **WHEN** the contrast check evaluates secondary and accent foregrounds on their surfaces in either theme
- **THEN** each ratio is at least 4.5:1

#### Scenario: Muted text in dark theme
- **WHEN** the contrast check evaluates muted text on the page background and on the muted surface in the dark theme
- **THEN** both ratios are at least 4.5:1

#### Scenario: Focus on a surfaced control
- **WHEN** a control on the page, a card, a popover, a muted surface, or a green supporting surface receives keyboard focus in either theme
- **THEN** its orange focus indicator has at least 3:1 contrast against its adjacent surface

#### Scenario: A token change breaks contrast
- **WHEN** a token is edited so that any checked pair falls below its threshold
- **THEN** the automated contrast check fails and names the pair and theme

## ADDED Requirements

### Requirement: Shared navigation has a consistent brand hierarchy
The shared navigation SHALL present the Rusticker identity as the primary brand element and use the same spacing, alignment, and interactive states across public pages. It SHALL remain readable and operable at narrow viewport widths and with every supported locale's labels.

#### Scenario: Shared navigation adapts to a narrow viewport
- **WHEN** a user opens any public page at a narrow mobile viewport
- **THEN** the brand, navigation links, theme control, and language control remain visible, usable, and free of horizontal overflow

#### Scenario: Navigation is consistent across pages
- **WHEN** a user visits two different public pages in the same locale and theme
- **THEN** the shared navigation uses the same brand hierarchy and interactive presentation on both pages
