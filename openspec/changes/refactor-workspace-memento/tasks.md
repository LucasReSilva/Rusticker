## 1. Extract workspace history policy

- [x] 1.1 Add focused memento/history helpers for snapshot copying, bounded append, and pop while preserving current shallow references and copied collections. Verified with `bun run test src/lib/tool/workspace-history.test.ts --maxWorkers=1`.
- [x] 1.2 Integrate the helpers into `EditorState`, keeping the undo array reactive and restoration side effects in the editor. Verified with `bun run test src/lib/state.svelte.test.ts --maxWorkers=1`; coverage includes brush baseline restoration and reactive undo availability through remove, undo, and source reset.
- [x] 1.3 Run `bun run check` and formatting/ESLint on changed files; inspect the final diff for behavior-only equivalence. `bun run check` passed with zero diagnostics; Prettier and ESLint passed for all changed TypeScript files, and the diff preserves the existing snapshot fields and lifecycle resets.
- [x] 1.4 Coordinator validation: run the full web suite with bounded workers, `bun run check`, lint, build, strict OpenSpec validation, and `git diff --check`; record results.

## Verification results

- Focused history helper tests: 2 passed. Focused editor state tests: 33 passed, including brush-baseline restoration and reactive undo availability.
- Full web suite: 70 files passed; 571 tests passed and 2 private-sample tests skipped with `bun run test --maxWorkers=1`.
- Final `bun run check`: zero errors and warnings. Full `bun run lint` and `bun run build` passed.
- Strict OpenSpec validation and `git diff --check` passed.
- Coordinator review and independent Luna peer review checked snapshot containers and shared pixel references, the 20-entry limit, reset sites, split/brush metadata, batch synchronization, and reactive state ownership. No blocking issues remain.
- The effect regression verifies availability transitions rather than incidental numbers of effect executions. No redo or persistent history was introduced.
- Build used the default localhost site URL because PUBLIC_SITE_URL was unset; no production configuration was changed.
