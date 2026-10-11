## Why

Releases currently rely on manual changelog curation, manual version bumping across `core/Cargo.toml` and `web/package.json`, and manual Git tag management. Adopting `git-cliff` and `release-plz` automates semantic versioning based on the repository's strictly enforced Conventional Commits, maintains `CHANGELOG.md` automatically, and integrates release PRs and automated tagging into the release workflow.

## What Changes

- **Changelog Generation (`git-cliff`)**:
  - Add root configuration file `cliff.toml` defining commit parsers, sections (Features, Bug Fixes, Performance, Refactoring, Documentation, Chores), link formats, and header/footer templates.
  - Support local changelog preview via `git-cliff` (or `bunx git-cliff` / `cargo git-cliff`).
- **Semantic Versioning & Release Automation (`release-plz`)**:
  - Add root configuration file `release-plz.toml` configuring release-plz for the Cargo workspace (`rusticker-core`).
  - Enable automated semantic version calculation based on Conventional Commits (`feat` -> minor, `fix` -> patch, breaking -> major).
  - Add a pre-release hook / script (`web/scripts/sync-version.ts`) that keeps `web/package.json` synchronized with the workspace release version.
- **Continuous Integration & Delivery Workflow**:
  - Add `.github/workflows/release.yml` using `release-plz-action` to open/update release PRs and publish GitHub Releases with git tags (`vX.Y.Z`) on merge to `main`.
- **Documentation**:
  - Update `CONTRIBUTING.md` and `README.md` to document the automated release flow.

## Capabilities

### New Capabilities

- `release-automation`: Automated semantic versioning and changelog generation using `git-cliff` and `release-plz` based on Conventional Commits, with release PR automation and GitHub release tagging.

### Modified Capabilities

*(None - existing product behavior capabilities remain unchanged).*

## Impact

- Touches workspace configuration (`release-plz.toml`, `cliff.toml`), GitHub Actions (`.github/workflows/release.yml`), `web/package.json`, and root documentation (`CONTRIBUTING.md`, `CHANGELOG.md`).
- Touches both `core/` (Cargo workspace releases) and `web/` (package version synchronization).

