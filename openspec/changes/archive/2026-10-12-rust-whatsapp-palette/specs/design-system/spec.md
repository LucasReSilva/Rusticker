## MODIFIED Requirements

### Requirement: Brand colors meet AA contrast in both themes
The app SHALL use a Rust-inspired orange as its primary brand color and WhatsApp-inspired green for secondary and accent colors. The primary color MUST remain distinct from green chroma-key backgrounds. In both the light and the dark theme, every text color token MUST have a contrast ratio of at least 4.5:1 against each background token it is designed to sit on, and the focus indicator, input borders, and the primary color used as a non-text indicator MUST have at least 3:1 against the page background. An automated check MUST verify these pairs and fail when any falls below its threshold.

#### Scenario: Rust orange is the primary brand color
- **WHEN** the light or dark theme is active
- **THEN** primary actions and indicators use an orange primary token, while the green brand color is reserved for secondary or accent tokens

#### Scenario: Primary button text in light theme
- **WHEN** the contrast check evaluates the primary foreground on the primary color in the light theme
- **THEN** the ratio is at least 4.5:1

#### Scenario: Green accents remain legible in both themes
- **WHEN** the contrast check evaluates secondary and accent foregrounds on their surfaces in either theme
- **THEN** each ratio is at least 4.5:1

#### Scenario: Muted text in dark theme
- **WHEN** the contrast check evaluates muted text on the page background and on the muted surface in the dark theme
- **THEN** both ratios are at least 4.5:1

#### Scenario: A token change breaks contrast
- **WHEN** a token is edited so that any checked pair falls below its threshold
- **THEN** the automated contrast check fails and names the pair and theme
