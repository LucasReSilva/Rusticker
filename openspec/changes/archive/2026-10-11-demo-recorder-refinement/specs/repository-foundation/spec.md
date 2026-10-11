## ADDED Requirements

### Requirement: Automated demo recording restricted to main releases in English and dark theme
The repository SHALL provide an automated demo recording tool that produces a visual showcase for documentation. The demo SHALL be recorded strictly in the English locale and using the dark theme. The recording execution SHALL be guarded such that it automatically skips execution when run on non-main branches without an explicit override flag, and temporary video artifacts SHALL be excluded from version control.

#### Scenario: Running demo recorder on a feature branch without override
- **WHEN** a contributor or agent runs the demo recorder on a feature branch without passing `--force`
- **THEN** the script logs an informative message stating it is restricted to main releases
- **AND** exits successfully with status code 0 without launching the browser or generating video artifacts

#### Scenario: Running demo recorder with force flag
- **WHEN** a contributor runs the demo recorder with the `--force` flag
- **AND** the static site is served
- **THEN** the browser opens the English route `/en/` with dark color scheme and dark mode persistence enabled
- **AND** successfully completes the automated interaction and produces `assets/demo.gif`

#### Scenario: Temporary recording artifacts are excluded from version control
- **WHEN** a demo recording run creates temporary video capture files
- **THEN** `.gitignore` prevents `web/scripts/temp-video/` and `*.webm` files from appearing in `git status`

