## ADDED Requirements

### Requirement: Processing modes
The tool page SHALL provide Automatic and Advanced processing modes, with Automatic selected by default. Automatic mode SHALL use the existing default background color of RGB (0, 177, 64) and tolerance 50 without requiring configuration. It SHALL explain that these are the default detection settings. Advanced mode SHALL expose the existing tolerance control, background color readout and eyedropper, and manual split-refinement actions. Mode controls and explanatory text SHALL be available in every supported locale and operable with keyboard and assistive technology. Switching modes SHALL preserve the loaded image, detected stickers, removals, tray-icon choice, current background and tolerance, and export state; a mode change alone SHALL NOT re-run detection or alter results.

#### Scenario: Start in automatic mode
- **WHEN** a user opens the tool page
- **THEN** Automatic is selected, existing default settings are used, and advanced tuning controls are hidden

#### Scenario: Change to advanced mode
- **WHEN** the user selects Advanced
- **THEN** existing background and tolerance controls and manual split-refinement actions become available without changing the current image or sticker results

#### Scenario: Return to automatic mode
- **WHEN** the user switches to Automatic after tuning or curating stickers
- **THEN** the current settings, image, sticker results, curation, tray icon, and export state remain intact, while advanced controls are hidden

#### Scenario: Select a mode by keyboard
- **WHEN** the mode selector has keyboard focus
- **THEN** the user can select either mode and assistive technology can determine the selected mode
