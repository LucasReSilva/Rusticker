## Context

Rusticker features an automated demo recording script (`web/scripts/record-demo.mjs`) that spins up the static server, drives Playwright in headless Chromium, and encodes a high-contrast GIF demo (`assets/demo.gif`) via FFmpeg. Previously, this ran in the default locale (Portuguese) and light mode, without checking whether the repository is on a release branch or ordinary feature branch. Committing binary GIF diffs frequently bloats Git packfile history.

## Goals / Non-Goals

**Goals:**
- Target `/en/` directly in `record-demo.mjs` to ensure the recorded demo is in English.
- Emulate dark theme via Playwright `colorScheme: 'dark'` and pre-set `localStorage.setItem('mode-watcher-mode', 'dark')` so that the dark theme is applied immediately on load.
- Guard `record-demo.mjs` so it automatically skips execution when run on non-main branches (e.g. `develop`, `feature/*`), exiting with code 0 unless `--force` is supplied.
- Ignore `web/scripts/temp-video/` and `*.webm` in `.gitignore`.
- Provide a single, authoritative re-recording of `assets/demo.gif` using `--force` so `README.md` features the updated showcase asset.

**Non-Goals:**
- Removing `assets/demo.gif` from the repository (the user preferred to keep the asset updated in README while preventing day-to-day dirtying).
- Modifying Svelte components, Rust core, or localization catalogs.

## Decisions

### Decision 1: Playwright dark mode configuration
Use both `colorScheme: 'dark'` in the browser context options and `page.addInitScript(() => localStorage.setItem('mode-watcher-mode', 'dark'))`.
*Rationale:* `mode-watcher` in Svelte checks `localStorage` first, and if unassigned, falls back to `prefers-color-scheme`. Setting both ensures instant dark mode without FOUC (flash of unstyled content) or race conditions during automated recording.
*Alternatives considered:* Clicking the theme dropdown menu in UI during recording. Rejected because it wastes recording time and clutters the showcase GIF.

### Decision 2: Branch gating logic
Inspect the active Git branch via `git rev-parse --abbrev-ref HEAD` and environment variable `process.env.GITHUB_REF`. If neither indicates `main` (or `master` or CI push to `main`), check for `--force` flag in `process.argv`. If `--force` is absent, print an informative message and exit with 0.
*Rationale:* Exiting 0 prevents breaking scripts or hooks that might inadvertently call demo recording, while cleanly avoiding execution and preventing git working tree dirtying.
*Alternatives considered:* Exiting with error code 1. Rejected because task runners or automated sweeps would fail loudly instead of cleanly skipping.

### Decision 3: Gitignore rules
Add `web/scripts/temp-video/` and `*.webm` to `.gitignore`.
*Rationale:* If a recording fails or is interrupted before FFmpeg finishes or cleans up, temporary webm videos will not show up in `git status`.

## Risks / Trade-offs

- [Risk] Local developer runs `bun run demo:record` on a feature branch expecting output. → [Mitigation] Script outputs clear message: `[demo] Skipping demo recording on branch '<branch>'. Demo recording is restricted to main releases. Use --force to run locally.`
- [Risk] Video encoding with FFmpeg fails if FFmpeg is not installed locally. → [Mitigation] Script already verifies or invokes FFmpeg, and error handling reports actionable advice.

