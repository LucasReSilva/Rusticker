## 1. Source inspection

- [x] 1.1 Add localized zoom, reset, and navigation text in every message catalog; verify with `bun run i18n:check`.
- [x] 1.2 Add zoom controls and keyboard/touch panning to the source preview while preserving box and eyedropper alignment; verify with `bun run test -- src/lib/components/Preview.svelte.test.ts`.

## 2. Precise crop editing

- [x] 2.1 Pass the active source URL into the Advanced crop editor and show the image with the current box; verify with `bun run check` and the bounds editor test.
- [x] 2.2 Add zoom/pan, pointer/touch move and resize, keyboard move and resize, and clamped integer bounds while retaining sliders and apply/reset/cancel; verify with `bun run test -- src/lib/components/StickerBoundsEditor.svelte.test.ts`.

## 3. Integration

- [x] 3.1 Verify a real-browser zoomed adjustment updates source preview and remains usable at mobile width; run focused `bun run test:e2e -- e2e/tool-ui/editor.spec.ts`.
- [x] 3.2 Run `bun run check`, `bun run lint`, `bun run lint:design`, `bun run i18n:check`, `bun run test`, and strict OpenSpec validation; record any limitations.
