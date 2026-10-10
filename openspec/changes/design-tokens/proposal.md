## Why

After `web-scaffold`, the app has routes and message catalogs but no visual language: no theme, no accessible component kit, no header with theme or language controls. `tool-ui` and `whatsapp-export` (Wave C) must build only from design-system components and theme tokens (DESIGN.md, "The Rule"), so the tokens, the component kit, and the guardrails that enforce them have to exist first.

## What Changes

This change touches **`web/` only**. It does not touch `core/`.

- Initialize shadcn-svelte in `web/` (`web/components.json`, the shared `cn()` helper) and add the components **button, card, slider, tooltip, badge, dialog, dropdown-menu, sonner, progress, skeleton, separator** to `web/src/lib/components/ui/`. Add the dependencies `mode-watcher` and `@lucide/svelte`, plus the component kit's own dependencies.
- Define the Rusticker theme in `web/src/app.css` for light and dark: a brand palette with its own **grape-violet primary** (AA contrast checked in both themes), radius scale, font stacks (system fonts only, no web-font download), a shadow scale, and a **checkerboard transparency token** exposed as a `bg-checkerboard` utility that adapts to the theme.
- Light/dark theme: follows the system by default; the user can pick light, dark, or system; the choice is persisted and restored without a flash of the wrong theme.
- Feature components `ThemeToggle.svelte`, `LanguageSwitcher.svelte` (built on DropdownMenu; keeps the current page, including translated slugs, without a page reload, and persists the choice), and `AppHeader.svelte` (app name, main navigation, both switchers, skip link), mounted in the root layout together with the toast host.
- Make the added `ui/` components text-free: built-in assistive text (for example the dialog's screen-reader "Close") comes from message catalogs. Add an accessibility baseline: keyboard operation, a visible focus ring, `prefers-reduced-motion` honored globally, translated `aria-label`s. Convert physical utilities in the generated components to logical ones (`ms-*`, `pe-*`, `start-*`, `end-*`, …).
- Add guardrails: a `lint:design` script that fails on raw color literals and physical-direction utilities in `web/src` (outside `app.css`), and a unit test that checks the contrast of the theme's token pairs in both themes.
- Add a dev-only living documentation route `/_design` showing every `ui/` component and variant in both themes. It is not linked, not prerendered, not in the sitemap, and returns 404 in production builds.
- Add messages with prefixes `theme_*`, `lang_*`, `design_*`, `a11y_*` to all three catalogs (pt-BR, en, es).
- Docs: update the token section of DESIGN.md with the final values; add one CHANGELOG bullet.

Out of scope (even though the brief mentions them in the design-system section):
- Feature components DropZone, Preview, Controls, Grid, StickerCard (`tool-ui`) and Export (`whatsapp-export`); keyboard support for the sticker grid and the eyedropper belongs to `tool-ui`.
- Error and success toast *content* (`error_*` from `wasm-worker`, `tool_*`/`export_*` later); this change only mounts the toast host.
- Locale detection order, URL strategy, and translated slug patterns (owned by `web-scaffold`'s localization); this change only uses them.
- Sitemap, hreflang, and PWA manifest (`pwa-seo`). This change only guarantees that `/_design` is never a public page.
- Adding the Select component (DropdownMenu covers language selection).

## Capabilities

### New Capabilities
- `design-system`: the app's visual and accessibility contract: theme behavior (system default, user choice, persistence), AA contrast in both themes, visible focus, reduced motion, transparency checkerboard, localized assistive text, the shared header with theme and language controls (language switch keeps the page), the token/direction guardrail check, and the dev-only living documentation page.

### Modified Capabilities
<!-- none -->

## Impact

- **Wave:** B (branch `feature/design-tokens`). **Depends on:** `web-scaffold` merged to `develop`. Runs in parallel with `wasm-worker` and `pwa-seo`. **Unblocks:** `tool-ui`, `whatsapp-export` (Wave C).
- **Files owned (create/modify):** `web/components.json`; theme tokens in `web/src/app.css`; `web/src/lib/components/ui/**` (the 11 components); `web/src/lib/components/{ThemeToggle,LanguageSwitcher,AppHeader}.svelte`; `web/src/routes/_design/**`; the header and toaster anchors in `web/src/routes/+layout.svelte`; keys `theme_*`, `lang_*`, `design_*`, `a11y_*` in `web/messages/{pt-BR,en,es}.json`.
- **Additional owned files (accepted by the integrator; no overlap with other changes):** `web/src/lib/utils.ts` (the `cn()` helper created by shadcn-svelte init), `web/scripts/lint-design.ts` and its test, `web/src/lib/theme/{contrast.ts,contrast.test.ts}`.
- **Layout:** only the `@design-tokens:header` block (start to `/@design-tokens:header` end marker) and the `<!-- @design-tokens:toaster -->` anchor that `web-scaffold` placed in `web/src/routes/+layout.svelte` are replaced; nothing else in that file changes (`<main id="main-content">` already exists).
- **CI:** no workflow edits. `web-scaffold`'s `web.yml` already runs `bun run --if-present lint:design`, so adding the script turns the check on.
- **Language switching** uses `web-scaffold`'s `switchLocale(locale)` (no page reload, editor state kept).
- **Dependencies (`web/package.json` / `bun.lock`):** `mode-watcher`, `@lucide/svelte`, and whatever shadcn-svelte init/add installs (`bits-ui`, `tailwind-variants`, `tailwind-merge`, `clsx`, `tw-animate-css`, `svelte-sonner`); script `lint:design`.
- **Docs:** DESIGN.md Part 1 "Tokens" and "Theme" sections; one bullet in CHANGELOG.md under Unreleased.
- **Privacy:** no network requests. Fonts are system fonts (no font CDN); theme and language preferences are stored only in the browser.
