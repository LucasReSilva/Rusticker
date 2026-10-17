## ADDED Requirements

### Requirement: Sticker-card actions are icon-first and accessible
Sticker-card actions SHALL use compact, recognizable icons in place of text-heavy controls. Each icon-only action MUST have an accessible name in every supported locale and a localized hint tooltip when the tooltip can be shown. An equivalent accessible hint MUST remain available when a tooltip cannot appear. Action targets MUST be usable by touch and keyboard, show visible keyboard focus, and preserve the existing action behavior.

#### Scenario: Identify an icon action
- **WHEN** a user points to or focuses a sticker-card action
- **THEN** its localized hint is available as a tooltip and its localized accessible name is exposed to assistive technology

#### Scenario: Tooltip is unavailable
- **WHEN** a tooltip cannot appear or be perceived
- **THEN** the action's localized accessible name and an adjacent or otherwise persistent accessible fallback still explain its purpose

#### Scenario: Use actions by keyboard
- **WHEN** a keyboard user tabs through sticker-card actions
- **THEN** every action receives a visible focus indicator and can be activated with the keyboard

#### Scenario: Use actions by touch
- **WHEN** a user activates an action on a touch device
- **THEN** the compact control has a touch-usable target and performs the same action as before

#### Scenario: Actions in each locale and theme
- **WHEN** a user views sticker cards in any supported locale and either theme
- **THEN** action names and hints are localized and the controls retain sufficient contrast
