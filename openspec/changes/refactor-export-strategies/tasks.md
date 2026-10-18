## 1. Encoding strategies

- [x] 1.1 Extract functional image encoding strategies and integrate static and Telegram exporters without changing errors or arguments; verify format, MIME fallback, encoder failure, progress, and archive regressions with `bun run test src/lib/export/static.test.ts src/lib/export/telegram.test.ts` in `web/`.

## 2. Export input identity

- [x] 2.1 Share input capture and comparison between controller and session; verify cache reuse, reorder/removal/ID/pixel/tray invalidation, source record mutation, and stale-download cancellation with `bun run test src/lib/export/session.test.ts src/lib/export/controller.svelte.test.ts` in `web/`.

## 3. Integration and documentation

- [x] 3.1 Document the strategy and shared identity utility in `ARCHITECTURE.md`; verify the description matches the final modules and preserves privacy guarantees.
- [x] 3.2 Run `bun run test`, `bun run check`, `bun run lint`, and `bun run build` in `web/`, plus `openspec validate refactor-export-strategies --strict`; record results and any environment limitations.

## Verification results

- Focused export regressions: 39 tests passed across four files.
- Full suite: 70 files passed, 582 tests passed, and 2 tests skipped with `bun run test --maxWorkers=2`. The first unrestricted run alongside lint and type checking hit three unrelated 5-second timeouts; no test timeout or repository configuration was changed.
- `bun run check`: zero errors and zero warnings.
- `bun run lint`, `bun run build`, strict OpenSpec validation, and `git diff --check`: passed.
- The local build used the default localhost site URL because PUBLIC_SITE_URL was unset; production hosting configuration was not part of this refactor.
