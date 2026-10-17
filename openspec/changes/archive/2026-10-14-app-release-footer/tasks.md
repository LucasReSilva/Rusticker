## 1. Shared footer

- [x] 1.1 Add footer strings to all three message catalogs and verify with `bun run i18n:check` in `web/`.
- [x] 1.2 Implement `AppFooter.svelte` with the package version, localized privacy route, repository and changelog links, semantic landmarks, and token-based focus styles; verify with `bun run check` and `bun run lint:design` in `web/`.
- [x] 1.3 Integrate the footer and viewport-height page shell in `+layout.svelte`; verify with a production build (`bun run build`) that prerendered pages contain the footer.

## 2. Verification

- [x] 2.1 Add a browser test for all public routes, locale-specific privacy links, no-script rendering, and 375-pixel overflow/focus behavior; verify with the focused `bun run test:e2e` command.
- [x] 2.2 Run `bun run check`, `bun run lint:design`, `bun run i18n:check`, `bun run test`, `bun run build`, and strict OpenSpec validation; verify every command succeeds.
