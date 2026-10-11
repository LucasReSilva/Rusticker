## Purpose

Automates semantic versioning, changelog generation via Conventional Commits, and release publication with Git tags across the Rust core crate and web frontend.

## ADDED Requirements

### Requirement: Automated semantic version calculation
The release automation system SHALL compute the next semantic version based on Conventional Commits in the git history since the previous tag. Commits of type `feat` SHALL trigger a minor version bump, commits of type `fix` or `perf` SHALL trigger a patch version bump, and commits indicating breaking changes with `!` or `BREAKING CHANGE:` footers SHALL trigger a major version bump.

#### Scenario: Feature commit triggers minor bump
- **WHEN** commits since the last release include `feat:` but no breaking changes
- **THEN** the calculated next release version increments the minor version component

#### Scenario: Fix commit triggers patch bump
- **WHEN** commits since the last release include only `fix:` or `perf:` changes
- **THEN** the calculated next release version increments the patch version component

#### Scenario: Breaking change triggers major bump
- **WHEN** commits since the last release contain breaking change markers
- **THEN** the calculated next release version increments the major version component

### Requirement: Automated changelog generation
The release automation system SHALL generate and maintain `CHANGELOG.md` according to git commit history, grouping entries under standard headings (Features, Bug Fixes, Performance, Refactoring, Documentation, Chores) with corresponding commit summaries and contributor attribution.

#### Scenario: Changelog generation on release
- **WHEN** release preparation is triggered
- **THEN** `CHANGELOG.md` is updated with a new release section containing categorized entries and commit links

### Requirement: Multi-package version synchronization
When a release version is calculated, the system SHALL synchronize the version number across `core/Cargo.toml` and `web/package.json`.

#### Scenario: Version sync across workspaces
- **WHEN** a new release version `X.Y.Z` is calculated
- **THEN** `core/Cargo.toml` and `web/package.json` both reflect version `X.Y.Z`

### Requirement: Automated release pull requests and tagging
The project CI/CD SHALL automate release creation by managing a release pull request that updates versions and changelogs, and upon merge to `main`, SHALL publish a GitHub Release and push a signed Git tag formatted as `vX.Y.Z`.

#### Scenario: Release PR is maintained
- **WHEN** new changes land on the integration branch
- **THEN** an automated release PR is created or updated with the pending version bump and changelog

#### Scenario: Release publication on merge
- **WHEN** the release PR is merged into `main`
- **THEN** a GitHub Release is published and the Git tag `vX.Y.Z` is created

