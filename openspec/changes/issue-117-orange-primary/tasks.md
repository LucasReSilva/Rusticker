## 1. Shared theme and navigation

- [x] 1.1 Refine shared orange-primary and green-supporting token usage and navigation hierarchy without editing files in PR #133; verify `cd web && bun run test -- src/lib/theme/contrast.test.ts` and inspect the header in both themes.
- [x] 1.2 Apply consistent responsive structure and spacing to the how-to-use, about, and history pages; verify the pages at 375 CSS pixels in each theme and locale without horizontal overflow.

## 2. Sticker-card actions

- [x] 2.1 Replace text-heavy sticker-card actions with recognizable icon buttons, localized tooltip hints, accessible names, visible focus, and touch-usable targets; verify keyboard and pointer behavior with the existing sticker grid tests.
- [x] 2.2 Confirm all card action hints and accessible names are present and usable in pt-BR, en, and es, with a fallback that works without a visual tooltip; verify `cd web && bun run i18n:check` and inspect the card in each locale.

## 3. Visual review and integration

- [x] 3.1 Add representative public-page and sticker-card before/after Storybook states that use application theme tokens; verify `cd web && bun run build-storybook` and inspect both theme variants.
- [x] 3.2 Run `cd web && bun run check`, `bun run lint`, and `bun run test`; verify the working diff does not edit the files owned by PR #133 and the refreshed public pages retain localized content.
