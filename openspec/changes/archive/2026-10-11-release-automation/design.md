## Context

See `proposal.md` for motivation. Rusticker is a monorepo with a Rust crate (`rusticker-core`) and a static SvelteKit web app (`web`). The repository strictly enforces Conventional Commits via Git hooks. Currently, version bumping and changelog maintenance are manual.

## Goals / Non-Goals

**Goals:**
- Automate semantic versioning calculation based on commit history and Conventional Commits.
- Integrate `git-cliff` for changelog generation via `cliff.toml`.
- Integrate `release-plz` for release orchestration via `release-plz.toml`.
- Provide automatic synchronization between `core/Cargo.toml` and `web/package.json`.
- Add `.github/workflows/release.yml` to automate release PRs and GitHub Releases with tags on `main`.

**Non-Goals:**
- Publishing `rusticker-core` to crates.io (`publish = false` is maintained).
- Changing the client-side static deployment mechanism.

## Decisions

### Decision 1: `git-cliff` Configuration (`cliff.toml`)
- Configure `cliff.toml` to group commit scopes and types into structured changelog sections:
  - `feat`: Features
  - `fix`: Bug Fixes
  - `perf`: Performance
  - `refactor`: Refactoring
  - `docs`: Documentation
  - `chore`: Miscellaneous Tasks
- Filter out trivial merge commits while preserving author attribution and Conventional Commit scopes (`core`, `web`, `i18n`, `ui`, `openspec`).

### Decision 2: `release-plz` Configuration (`release-plz.toml`)
- Configure `release-plz.toml` at repository root:
  ```toml
  [workspace]
  publish = false
  changelog_config = "cliff.toml"
  pr_name = "chore: release {{ package }} {{ version }}"
  ```
- Use a pre-release hook / script (`web/scripts/sync-version.ts`) that copies the determined version into `web/package.json` so that web and core versions never diverge.

### Decision 3: GitHub Actions Release Workflow (`.github/workflows/release.yml`)
- Trigger on push to `main` and `workflow_dispatch`.
- Use the official `release-plz/action`:
  - If unreleased commits exist, opens/updates a Release PR targeting `main`.
  - When the Release PR is merged into `main`, tags the commit as `vX.Y.Z` and publishes the GitHub Release.
  - Deployment workflow `.github/workflows/deploy.yml` then automatically publishes the static site for that release.

## Risks / Trade-offs

- *[Risk] Release PR loops in GitHub Actions* → Mitigation: `release-plz` ignores its own release commits and only operates when conventional commits indicate changes.
- *[Risk] Web package out of sync* → Mitigation: `sync-version.ts` validates and updates `web/package.json` before commit.

