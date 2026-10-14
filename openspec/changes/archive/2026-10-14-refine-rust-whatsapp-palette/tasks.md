## 1. Theme and interaction colors

- [x] 1.1 Refine orange/green tokens and add opaque hover tokens; extend gamut and contrast checks for hover, focus, and control borders; verify with `bun run test -- src/lib/theme/contrast.test.ts` in web.
- [x] 1.2 Apply tokens to shared buttons and badges, header branding, and green pack guidance; verify with `bun run check`, `bun run lint:design`, and browser palette/focus checks.

## 2. Documentation and integration

- [x] 2.1 Update DESIGN.md token and contrast tables from the checked palette; verify values against `bun run test -- src/lib/theme/contrast.test.ts` and review the existing two-theme showcase.
- [x] 2.2 Verify `openspec validate refine-rust-whatsapp-palette --strict`, all web checks (`bun run check`, `bun run lint`, `bun run lint:design`, `bun run test`, `bun run i18n:check`), production build/SEO/output checks, and browser tests; record results before opening the PR to develop.

## Verification results

- OpenSpec strict validation passed.
- Svelte check: zero errors or warnings; lint, design lint, and catalog completeness passed.
- Unit suite: 54 files passed, 425 tests passed, two existing skips.
- Production build with `BASE_PATH=/Rusticker`, SEO check, and build-output verification passed.
- Full stock browser suite with `CI=true` and two workers: 79 passed, one optional private-image fixture skipped. The run used fresh servers to avoid other worktrees' listeners. Windows server shutdown required stopping only the two server processes created by this run after all cases finished; Playwright exited successfully.
