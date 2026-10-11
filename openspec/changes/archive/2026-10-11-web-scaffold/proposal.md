## Why

Every frontend change on the roadmap (`design-tokens`, `wasm-worker`, `pwa-seo`, `tool-ui`, `whatsapp-export`) needs a web app to build on, and the brief requires that app to be static, hosted on GitHub Pages, and multilingual from day one. This change creates that shell: the routes with their final translated URLs, locale resolution, prerendering, the message catalogs with a completeness check, and CI and deploy pipelines. Later changes then only add features.

## What Changes

This change touches **`web/` only**, plus two new GitHub Actions workflows under `.github/workflows/`. It does **not** touch `core/` and does **not** depend on the wasm package: nothing in `web/` imports `rusticker-core` yet. The workflows are pre-wired with wasm build steps that are skipped while `core/Cargo.toml` is absent (contract addendum R1).

- Scaffold `web/` with the SvelteKit CLI (minimal template, TypeScript, Bun), then add Tailwind CSS, Paraglide (locales `pt-BR` as base, `en`, `es`), ESLint, Prettier, and Vitest through the CLI add-ons.
- Configure static output for GitHub Pages:
  - all files are emitted as static files, with a `404.html` SPA fallback;
  - the base path comes from the `BASE_PATH` environment variable, empty in development and `/<repo-name>` in the deploy workflow;
  - the content pages are prerendered for every locale;
  - the tool route renders only in the browser and is a placeholder page for now.
- Localized routing with the **translated slugs** from the shared contract:

  | page       | pt-BR (base) | en               | es              |
  |------------|--------------|------------------|-----------------|
  | tool       | `/`          | `/en`            | `/es`           |
  | how to use | `/como-usar` | `/en/how-to-use` | `/es/como-usar` |
  | about      | `/sobre`     | `/en/about`      | `/es/acerca-de` |

- Locale resolution in this order: URL, then saved preference, then browser language, then `pt-BR`. `<html lang>` always matches the active locale.
- Root layout with a minimal, unstyled header: the app name and links to the three pages, all localized.
- How-to-use and about pages with short but real content in all three locales. The about page is the privacy page: everything runs locally and images are never uploaded. The localized not-found page also comes in this change.
- Message catalogs `web/messages/{pt-BR,en,es}.json` with the keys this change owns: `app_*`, `nav_*`, `meta_*`, `page_how_to_use_*`, `page_about_*`.
- `web/scripts/i18n-check.ts` and the script `i18n:check`. It fails when any locale is missing a key that exists in `pt-BR`, and also when a locale has extra keys or empty values. Also the scripts `check`, `lint`, `format`, `test`, and `build`.
- CI, pre-wired once for the whole roadmap (addendum R1); no later change edits these files:
  - `.github/workflows/web.yml` runs, in order: checkout; Bun; Rust and wasm-pack setup plus "Build wasm", all three guarded by `hashFiles('core/Cargo.toml') != ''` and placed before `bun install --frozen-lockfile`; `i18n:compile`, `check`, `lint`, `bun run --if-present lint:design`, `test`, `i18n:check`, build with `BASE_PATH`, `bun run --if-present seo:check`, and `verify:build`.
  - `.github/workflows/deploy.yml` has the same wasm steps, builds with `BASE_PATH=/<repo-name>` and `PUBLIC_SITE_URL`, and deploys to GitHub Pages on every push to `main` (i.e. each gitflow release merged into `main`).
- Test setup with two Vitest projects (addendum R4): `server` (Node) and `client` (jsdom, Testing Library, Svelte browser conditions), so later changes never edit the test config.
- `switchLocale(locale)` in `src/lib/i18n/` (addendum R7) saves the preference and moves to the same page in the new locale through in-app navigation, without reloading. The root layout re-renders localized text when the locale changes.
- Marked extension anchors (addenda R2, R3): `<!-- @design-tokens:header -->`, `<!-- @design-tokens:toaster -->`, and `<!-- @pwa-seo:registration -->` in the root layout, with `<main id="main-content">`; `/* @pwa-seo:handle */` inside the `sequence(...)` in `hooks.server.ts`.
- Docs (last task): the web-scaffold parts of README, DESIGN, and CONTRIBUTING (final slugs, Paraglide config path, scripts, hosting), and one CHANGELOG bullet.

Out of scope (even though the brief mentions these nearby):
- shadcn-svelte init, theme tokens, `mode-watcher`, `@lucide/svelte`, header styling, `ThemeToggle`, `LanguageSwitcher`, and the `/_design` route. These belong to `design-tokens`. This change offers `switchLocale`, but no UI to choose a locale.
- The wasm dependency, the `build:wasm` / `dev:all` scripts, and the worker. These belong to `wasm-worker`. The guarded wasm CI steps are pre-wired here and do nothing until `core/` exists.
- The real tool UI. It belongs to `tool-ui`; this change ships only a placeholder page.
- `hreflang` alternate links, the sitemap, `robots.txt`, the PWA manifest, and offline support. These belong to `pwa-seo`.
- Any change to `core/`, to the root `.gitignore`, or to the Rust CI.

## Capabilities

### New Capabilities
- `web-app-shell`: how the web app is delivered as a fully static site. Covers the page set and their routes, prerendered content pages, the browser-only tool route, the SPA fallback for unknown and non-prerendered URLs, deployment under a configurable base path, and the absence of any server-side runtime.
- `localization`: the supported locales and the base locale, locale-prefixed URLs with translated slugs, the locale resolution order, the saved locale preference, the document language attribute, the rule that all user-visible text comes from complete per-locale catalogs, and the automated completeness check.

### Modified Capabilities
<!-- None. repository-foundation already requires localized text in every locale; this change adds behavior and changes none of its requirements. -->

## Impact

- **Wave:** A (branch `feature/web-scaffold`), starting from `develop`. **Depends on:** nothing; it runs in parallel with `core-detection`. **Unblocks:** `design-tokens`, `pwa-seo`, and, together with `core-detection`, `wasm-worker` (all in Wave B).
- **Files owned (create/modify):**
  - `web/**` initial scaffold: `package.json`, `bun.lock`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, ESLint and Prettier config, Vitest setup, `.gitignore`, `.prettierignore`, `project.inlang/**`, `messages/{pt-BR,en,es}.json` (keys `app_*`, `nav_*`, `meta_*`, `page_how_to_use_*`, `page_about_*`), `src/app.html`, `src/app.d.ts`, `src/app.css` (the bare Tailwind import only; theme tokens belong to `design-tokens`), `src/hooks.ts`, `src/hooks.server.ts`, `src/hooks.client.ts`, `src/lib/i18n/**` (route table, locale preference, and locale matching helpers), the `src/routes/**` skeleton (root layout, error page, tool placeholder, how-to-use, about), and `scripts/i18n-check.ts`;
  - `.github/workflows/web.yml` and `.github/workflows/deploy.yml`.
- **Shared-file notes for later changes:**
  - Later changes do **not** edit the workflows or the Vitest config; they only add the scripts the pre-wired steps call (`lint:design`, `seo:check`).
  - `design-tokens` replaces the `@design-tokens:header` and `@design-tokens:toaster` anchors in `src/routes/+layout.svelte`. The header block runs from `<!-- @design-tokens:header -->` to `<!-- /@design-tokens:header -->` and wraps the minimal header; design-tokens replaces the whole block.
  - `pwa-seo` replaces the `@pwa-seo:registration` anchor in the layout and the `@pwa-seo:handle` anchor in `src/hooks.server.ts`.
  - `tool-ui` takes over `src/routes/+page.svelte` and `+page.ts`.
- **Dependencies (web, dev):** SvelteKit, Svelte 5, Vite, the static adapter, Tailwind CSS v4, Paraglide JS, ESLint, Prettier, Vitest, jsdom, `@testing-library/svelte`, `svelte-check`, TypeScript.
- **Hosting:** GitHub Pages must be enabled with source "GitHub Actions" once a GitHub remote exists. The deploy workflow cannot run before that.
- **Privacy:** no runtime network calls other than loading the site's own static assets. The locale preference is stored only in the browser's local storage and is never sent anywhere.
