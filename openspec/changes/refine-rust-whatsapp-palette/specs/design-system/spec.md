## MODIFIED Requirements

### Requirement: Brand colors meet AA contrast in both themes
The app SHALL use a saturated Ferris-inspired Rust orange as its primary brand color and WhatsApp-inspired green for secondary and accent colors. The primary color MUST remain distinct from green chroma-key backgrounds. The header wordmark, primary actions, and keyboard focus indicators SHALL use the orange brand color; pack guidance and secondary pack-download actions SHALL use green supporting colors. In both the light and the dark theme, every text color token MUST have a contrast ratio of at least 4.5:1 against each background token it is designed to sit on, including enabled filled controls in their resting and hover states. Focus indicators and input borders MUST have at least 3:1 against their adjacent intended surfaces, and the primary color used as a non-text indicator MUST have at least 3:1 against the page background. An automated check MUST verify these pairs and fail when any falls below its threshold.

#### Scenario: Rust orange is the primary brand color
- **WHEN** the light or dark theme is active
- **THEN** the header wordmark, primary actions, and keyboard focus indicators use saturated orange, while green supports pack guidance and secondary actions

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
