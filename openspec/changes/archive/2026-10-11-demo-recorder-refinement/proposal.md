# Proposal: Demo Recorder Refinement

## Why

The automated demo recording tool was previously recording in Portuguese and light mode, and could be executed arbitrarily during development, dirtying the git working directory with large binary diffs (1.8MB+ GIF files). Restricting demo recording to the English locale and dark theme, and guarding its execution so that it only runs when targeting the `main` release branch (or with explicit `--force`), ensures reproducible, high-quality showcase assets for documentation while keeping day-to-day Git history clean.

## What Changes

- Modify `web/scripts/record-demo.mjs` to navigate specifically to `/en/` (English route) and wait for English UI strings.
- Configure Playwright in `web/scripts/record-demo.mjs` to render strictly in Dark theme (`colorScheme: 'dark'` and `mode-watcher-mode: 'dark'` localStorage setting).
- Add branch guards in `web/scripts/record-demo.mjs` so execution is skipped automatically unless running on `main` (or CI targeting `main`), or when `--force` is explicitly provided.
- Update `.gitignore` to ignore temporary video artifacts (`web/scripts/temp-video/`, `*.webm`).
- Re-record `assets/demo.gif` once with `--force` in English and dark theme to update `README.md` with the official showcase.

## Capabilities

### Modified Capabilities
- `repository-foundation`: Add requirement specifying that automated demo recording is restricted to main releases, rendered in English and dark theme, and ignores temporary recording artifacts.

## Impact

- `web/scripts/record-demo.mjs`: Updated navigation, theme configuration, and execution guards.
- `.gitignore`: Excludes `web/scripts/temp-video/` and `*.webm`.
- `assets/demo.gif`: Refreshed with dark theme English recording.
- No changes to user-facing production code or WebAssembly core.

