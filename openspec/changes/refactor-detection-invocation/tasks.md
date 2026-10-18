## 1. Shared Invocation

- [x] 1.1 Extract the common worker invocation lifecycle in `web/src/lib/detection/index.ts` while preserving operation-specific request construction, defensive copies, crash racing, error conversion, recycling, and disposal timing; verify with the focused detection tests.
- [x] 1.2 Add fake-worker coverage showing a split request recovers after `WorkerFailed` by using a fresh worker; verify with `bun run test src/lib/detection/index.test.ts --maxWorkers=1`.
- [x] 1.3 Verify transport rejection normalization and recovery, plus reuse after a core-coded failure; verify with `bun run test src/lib/detection/index.test.ts --maxWorkers=1`.

## 2. Integration Validation

- [x] 2.1 Run `bun run test --maxWorkers=1`, `bun run check`, `bun run lint`, and `bun run build` in `web/`; run strict OpenSpec validation for this change and `git diff --check`; record all results.

## Verification results

- Focused detector tests: 7 passed.
- Full web suite: 69 files passed; 570 tests passed and 2 private-sample tests skipped with `bun run test --maxWorkers=1`.
- `bun run check`: zero errors and warnings. Full `bun run lint` and `bun run build` passed.
- Strict OpenSpec validation and `git diff --check` passed.
- Coordinator review and independent Luna peer review found no blocking issues. Review covered captured-engine ownership, crash and transport rejection handling, core-error reuse, caller-buffer preservation, scheduling, and disposal.
- Build used the default localhost site URL because PUBLIC_SITE_URL was unset; no production configuration was changed.
