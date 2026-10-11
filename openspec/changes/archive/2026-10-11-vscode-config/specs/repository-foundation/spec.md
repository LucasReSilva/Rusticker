## ADDED Requirements

### Requirement: Standardized IDE workspace tasks
The repository SHALL provide a `.vscode/tasks.json` configuration defining standardized tasks for development server execution, WebAssembly building, static site generation, linting, formatting, type checking, test suites, and release verification.

#### Scenario: Contributor executes tasks from IDE
- **WHEN** a contributor opens the task runner in the IDE
- **THEN** preconfigured tasks for building, checking, testing, and developing both the core crate and web application are available for execution

### Requirement: Standardized IDE debug launch configurations
The repository SHALL provide a `.vscode/launch.json` configuration defining launch profiles for browser debugging against the local development server, unit test debugging, and native test debugging.

#### Scenario: Contributor initiates browser debugging
- **WHEN** a contributor initiates the web debug launch configuration
- **THEN** the browser launches attached to the local development server port

#### Scenario: Contributor debugs unit tests
- **WHEN** a contributor launches the test debug configuration
- **THEN** the test runner executes with debugger attached

### Requirement: Recommended workspace extensions
The repository SHALL provide a `.vscode/extensions.json` file recommending essential extensions for language support, formatting, linting, and localization.

#### Scenario: IDE suggests workspace extensions
- **WHEN** a contributor opens the workspace in the IDE
- **THEN** recommended extensions for Svelte, Rust, TypeScript, Tailwind CSS, and localization are presented

### Requirement: IDE configuration version control tracking
The repository SHALL track shared workspace task definitions, launch configurations, and extension recommendations in `.vscode/` while excluding developer-specific local settings from version control.

#### Scenario: Checking git status on workspace config
- **WHEN** `.vscode/tasks.json`, `.vscode/launch.json`, and `.vscode/extensions.json` are present in the repository
- **THEN** they are tracked by version control without staging personal workspace settings

