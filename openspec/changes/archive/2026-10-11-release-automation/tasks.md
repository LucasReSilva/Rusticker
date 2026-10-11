## 1. Changelog Configuration (`git-cliff`)

- [x] 1.1 Create `cliff.toml` at the repository root configuring commit parsers, categorized sections (Features, Bug Fixes, Performance, Refactoring, Documentation, Miscellaneous Tasks), and link templates for Conventional Commits. Verify by checking file existence and TOML syntax.
- [x] 1.2 Add a changelog generation script in `web/package.json` and verify that git-cliff generates a valid Markdown preview from git history. Verify with `bun run --if-present changelog:preview` or dry-run.

## 2. Release-Plz Configuration & Version Synchronization

- [x] 2.1 Create `release-plz.toml` at the repository root configuring the Cargo workspace for automated semantic versioning, `publish = false`, and integration with `cliff.toml`. Verify file existence and valid TOML syntax.
- [x] 2.2 Create `web/scripts/sync-version.ts` to synchronize `web/package.json` version from `core/Cargo.toml`, and register script `"version:sync": "bun scripts/sync-version.ts"` in `web/package.json`. Verify that `bun run version:sync` succeeds and verifies version parity.

## 3. GitHub Actions Release Workflow

- [x] 3.1 Create `.github/workflows/release.yml` utilizing `release-plz/action` configured for `main` pushes and `workflow_dispatch`, with permissions `contents: write` and `pull-requests: write`. Verify YAML syntax with `bunx yaml-lint .github/workflows/release.yml`.

## 4. Documentation & Verification

- [x] 4.1 Update `CONTRIBUTING.md` and `README.md` to document the automated release flow, git-cliff, and release-plz. Verify Markdown formatting.
- [x] 4.2 Run full local verification suites: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and `bun run check`, `bun run lint`, `bun run test`, `bun run build`. Verify all exit with code 0.
- [x] 4.3 Validate OpenSpec: `openspec validate --all`. Verify all pass.

