## 1. Batch progress

- [x] 1.1 Add localized progress, success, and attention messages in every catalog; verify with `bun run i18n:check` in `web/`.
- [x] 1.2 Render aggregate progress from real batch states with accessible text and reduced-motion-safe decoration; verify with `bun run check` in `web/`.

## 2. Verification

- [x] 2.1 Cover batch progress, failure, retry, and clear behavior in focused component tests; verify with `bun run test` in `web/`.
- [x] 2.2 Run design lint and production build; verify with `bun run lint:design` and `bun run build` in `web/`.
