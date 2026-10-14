## 1. Mode contract and controls

- [x] 1.1 Add localized Automatic/Advanced labels and descriptions in every catalog, and implement an accessible selector defaulting to Automatic; verify catalog parity and selector tests.
- [x] 1.2 Show background/tolerance tuning and eyedropper only in Advanced while preserving current values; verify mode switching does not invoke detection or mutate results.
- [x] 1.3 Show manual split-refinement actions only in Advanced; verify automatic mode hides requests while existing split proposals remain safely reviewable.

## 2. Verification

- [x] 2.1 Add or update UI tests for defaults, mode transitions, accessibility, and retained editor/export state; verify with `bun run test:unit --run src/lib/components/Controls.svelte.test.ts src/lib/components/Preview.svelte.test.ts src/lib/components/Grid.svelte.test.ts src/routes/page.svelte.test.ts`.
- [x] 2.2 Run `bun run check`, `bun run lint`, the targeted UI test command above, and `bun run build` in `web/`; validate this change with `openspec validate processing-modes --strict`.
