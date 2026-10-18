## 1. Worker Lifecycle

- [x] 1.1 Extract the shared worker lifecycle while preserving payloads, routing, callback order, defaults, diagnostics, and cancellation behavior; verify the focused lifecycle tests pass.
- [x] 1.2 Cover reported/runtime worker errors, cancellation after settlement, callback ordering, and conventional/learned payloads in `process.test.ts`; verify with `bun run test src/lib/upscaling/process.test.ts --maxWorkers=1`.

## 2. Verification

- [x] 2.1 Run `bun run check` and format/ESLint checks for changed files; confirm the focused tests and checks pass.
- [x] 2.2 Run integration verification from the coordinator: full web suite with bounded workers, `bun run lint`, `bun run build`, strict OpenSpec validation, and `git diff --check`.

## Verification results

- Focused lifecycle tests: 6 passed, including conventional/learned request payloads, callback ordering, error codes and diagnostics, and cancellation after settlement.
- Full web suite: 69 files passed; 570 tests passed and 2 private-sample tests skipped with `bun run test --maxWorkers=1`.
- `bun run check`: zero errors and warnings. Full `bun run lint` and `bun run build` passed.
- Strict OpenSpec validation and `git diff --check` passed.
- Coordinator review and independent Luna peer review found no blocking issues. Unknown and repeated messages retain their previous handling.
- Build used the default localhost site URL because PUBLIC_SITE_URL was unset; no production configuration was changed.
