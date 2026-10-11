## 1. Tooling and Git Configuration

- [x] 1.1 Update `.gitignore` to ignore `web/scripts/temp-video/` and `*.webm`, and verify with `git status --ignored`
- [x] 1.2 Refactor `web/scripts/record-demo.mjs` with branch gating logic (`main`, `master`, `CI`, `--force`) and verify that running `bun run demo:record` on a feature branch skips execution with code 0

## 2. English and Dark Theme Automation

- [x] 2.1 Update `web/scripts/record-demo.mjs` to target `/en/` and configure dark color scheme & localStorage mode-watcher setting
- [x] 2.2 Run `bun run demo:record --force` to record the showcase demo and verify `assets/demo.gif` is generated in dark mode and English
- [x] 2.3 Verify repository quality checks with `bun run check`, `bun run lint`, and `bun run test`
