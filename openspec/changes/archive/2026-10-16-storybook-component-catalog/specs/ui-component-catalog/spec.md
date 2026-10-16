## Purpose

Provides contributors with a local, isolated catalog to inspect and document reusable web components, their variants, and theme behavior without changing the production application.

## ADDED Requirements

### Requirement: Contributors can run and build the component catalog
The web package SHALL provide documented Bun commands to start an interactive local component catalog and build its static preview without requiring the production application to run.

#### Scenario: Start the local preview
- **WHEN** a contributor runs the documented Storybook command from `web/`
- **THEN** a local preview server starts and renders the component catalog without build errors

#### Scenario: Build the static catalog
- **WHEN** a contributor runs the documented catalog build command from `web/`
- **THEN** Storybook produces its static output separately from the production application output

### Requirement: Core design-system components are cataloged
The catalog SHALL include representative variants and states for the reusable Button, Card, Badge, Slider, Progress, and Dialog components.

#### Scenario: Inspect component variants
- **WHEN** a contributor opens the catalog for a core design-system component
- **THEN** the component's available variants or meaningful interaction states are represented by selectable stories

### Requirement: Component previews use the application design tokens
The catalog SHALL load the application's local design tokens and SHALL allow every component preview to be inspected in both light and dark themes.

#### Scenario: Switch preview theme
- **WHEN** a contributor selects light or dark in the catalog toolbar
- **THEN** the preview applies the matching application theme tokens to the rendered component

### Requirement: Catalog preview runs without external assets
The catalog SHALL load its runtime assets, styles, and fonts locally and SHALL NOT require a third-party network request or CDN to render its stories.

#### Scenario: Preview while external network access is unavailable
- **WHEN** a contributor loads a component story with external network access disabled
- **THEN** the story renders using local assets and theme styles

### Requirement: Catalog remains outside the production application
The catalog and its development-only tooling SHALL NOT be included in the built production application or its runtime routes.

#### Scenario: Build the application for production
- **WHEN** the production application build completes
- **THEN** the Storybook manager, preview, and story source are absent from the application output
