## 1. Semantic palette and accessibility

- [x] 1.1 Replace the violet light/dark theme values in `web/src/app.css` with in-gamut Rust-orange primary and WhatsApp-green secondary/accent tokens, keeping destructive states red and neutral/checkerboard/shadow tokens compatible; verify both themes with `bun run test -- src/lib/theme/contrast.test.ts` from `web/`.
- [x] 1.2 Extend the theme tests to assert that primary tokens are orange and secondary/accent tokens are green in both themes; verify the hue assertions, existing contrast pairs, checkerboard constraints, and sRGB gamut checks with `bun run test -- src/lib/theme/contrast.test.ts` from `web/`.

## 2. Brand assets and documentation

- [x] 2.1 Update `DESIGN.md` with the final token values, sRGB references, measured contrast ratios, and the semantic role of each brand color; verify the table against the values produced by the contrast test and review Markdown formatting with `bun run lint` from `web/`.
- [x] 2.2 Align the static manifest/browser theme color with the light primary token and test that the constant matches the CSS token; verify with `bun run test -- src/lib/seo/manifest.test.ts src/lib/seo/head.test.ts` from `web/`.
- [x] 2.3 Update only the existing PWA icon colors, regenerate the derived icons from `web/static/icons/icon.svg`, and verify generated files plus `bun run test -- src/lib/seo/manifest.test.ts` from `web/`.

## 3. Rendered review and integration

- [x] 3.1 Add a browser test that checks the orange/green semantic tokens on the public app and development showcase across Portuguese, English, and Spanish in light and dark themes; verify with `bun run test:e2e -- e2e/design-tokens/palette.dev.spec.ts --project=dev` from `web/`.
- [x] 3.2 Review the main tool page, design showcase, and generated app icon in both themes; run `bun run check && bun run lint && bun run lint:design && bun run test && bun run i18n:check && bun run build && bun run verify:build && bun run test:e2e` from `web/`, and `openspec validate rust-whatsapp-palette --strict` from the repository root.
