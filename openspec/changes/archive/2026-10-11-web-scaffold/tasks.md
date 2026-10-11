## 1. Branch and scaffold

- [x] 1.1 Confirm wave and branch. This change is Wave A, on branch `feature/web-scaffold`, created from `develop`. No other change needs to be merged first; it runs in parallel with `core-detection` and must not touch `core/`, `Cargo.toml`, `.github/workflows/rust.yml`, or the root `.gitignore`. Verify with `git branch --show-current`, which prints `feature/web-scaffold`.
- [x] 1.2 From the repo root, run `bunx sv create web --template minimal --types ts --install bun --no-add-ons` and record the `sv` version in the PR description. Verify with `cd web && bun run dev`: the default page is served at `http://localhost:5173/`.
- [x] 1.3 In `web/`, run `bunx sv add tailwindcss paraglide eslint prettier vitest`. Choose Paraglide languages `pt-BR,en,es` with no demo page, and do not choose a Vitest real-browser component project (design D1). Verify that `bun install` succeeds and that `web/project.inlang/settings.json` and `web/messages/{pt-BR,en,es}.json` exist.
- [x] 1.4 Normalize to Bun:
  - replace any `npm`/`npx` in the generated scripts with `bun run`/`bunx`;
  - add `"packageManager": "bun@<version>"`;
  - add `src/lib/paraglide/` to `web/.gitignore`, `.prettierignore`, and the ESLint ignores.

  Verify that `grep -rn "npm \|npx " web/package.json` prints nothing and that `git status` lists no `src/lib/paraglide` files.
- [x] 1.5 Configure the Vitest projects in `vite.config.ts` (design D12, addendum R4):
  - `server`: Node; includes `src/**/*.{test,spec}.{js,ts}` and `scripts/**/*.{test,spec}.ts`; excludes `*.svelte.{test,spec}.*`;
  - `client`: jsdom; includes `src/**/*.svelte.{test,spec}.{js,ts}`; uses the `browser` resolve condition and `vitest-setup-client.ts`.

  Add the dev dependencies `jsdom`, `@testing-library/svelte`, and `@testing-library/jest-dom`. Verify with a throwaway `src/smoke.test.ts` and a throwaway `src/smoke.svelte.test.ts` (which renders a tiny component): `bun run test` reports both projects passing. Delete both files afterwards.

## 2. Static output and base path

- [x] 2.1 Switch to the static adapter in `svelte.config.js`:
  - `fallback: '404.html'`, `strict: true`;
  - `paths.base` from `BASE_PATH`, validated so an invalid value throws;
  - `prerender.handleHttpError: 'fail'` and `handleMissingId: 'fail'` (design D2).

  Verify that `BASE_PATH=Rusticker bun run build` fails with a clear error and that `BASE_PATH=/Rusticker bun run build` succeeds.
- [x] 2.2 Add `src/routes/+layout.ts` (`prerender = true`, `trailingSlash = 'never'`) and the tool `src/routes/+page.ts` (`ssr = false`, `prerender = true`, `trailingSlash = 'always'`). Verify that `bun run build` emits `build/index.html` and `build/404.html`.

## 3. Localization core

- [x] 3.1 Finalize `web/project.inlang/settings.json`:
  - `baseLocale: "pt-BR"`;
  - `locales: ["pt-BR","en","es"]`;
  - `pathPattern: "./messages/{locale}.json"`.

  Add the `i18n:compile` script and wire it into `prepare` and `check` (design D3, D8). Verify that `bun run i18n:compile` generates `src/lib/paraglide/` and that `bun run check` passes on a clean clone after `bun install`.
- [x] 3.2 Create `src/lib/i18n/routes.js` with the contract slug table, `internalPath`, `buildUrlPatterns(base)` (page patterns, then catch-alls in the order `/en/*`, `/es/*`, `/*`), and `prerenderEntries()` (design D4). Add `routes.test.ts` with these checks:
  - the table equals the contract table, with `/en/` and `/es/` for the tool;
  - every page has a slug for every locale in `settings.json`;
  - each of the 9 URLs, plus `/en/sobre` and `/es/unknown`, resolves to the expected internal path and locale, with base `''` and with `/Rusticker`.

  Verify with `bun run test`.
- [x] 3.3 Wire Paraglide into the app:
  - in `vite.config.ts`, pass the strategy `['url','baseLocale']` (not `localStorage`: Paraglide would persist the URL locale and overwrite the saved preference, see design D3) and `urlPatterns: buildUrlPatterns(process.env.BASE_PATH ?? '')` to the Paraglide plugin, inside a clearly delimited `// paraglide` block;
  - in `src/hooks.ts`, add `reroute` using `deLocalizeUrl`;
  - in `src/hooks.server.ts`, export `handle = sequence(paraglideHandle, /* @pwa-seo:handle */)`, where `paraglideHandle` is the middleware plus the `%paraglide.lang%` replacement (design D3, addendum R3);
  - in `src/app.html`, set `<html lang="%paraglide.lang%">`;
  - in `svelte.config.js`, set `prerender.entries` from `prerenderEntries()`.

  Verify with `bun run dev`: `/en/about` and `/es/acerca-de` reach the about route, and the page source shows `lang="en"` and `lang="es"`.
- [x] 3.4 Create the helpers, each with unit tests, and verify with `bun run test`:
  - `src/lib/i18n/links.ts` (`localizedPath`);
  - `src/lib/i18n/preference.ts` (`readSavedLocale` and `saveLocalePreference`, guarded with try/catch, using Paraglide's localStorage key);
  - `src/lib/i18n/negotiate.ts` (`matchBrowserLocale`);
  - `src/lib/i18n/entry-redirect.ts` (`entryRedirect`).

  The tests cover:
  - every scenario of the "Locale resolution order" requirement;
  - "Storage blocked" (a throwing storage stub);
  - unsupported saved values being ignored;
  - query and hash being preserved;
  - base path handling.
- [x] 3.5 Add `src/hooks.client.ts` with an `init` hook that calls `entryRedirect` with `readSavedLocale()` and `navigator.languages`, then `location.replace` when there is a target. Verify manually with `bun run build && bun run preview`, in a browser with language `en-US` and empty storage: opening `/sobre` ends at `/en/about`. With `localStorage.PARAGLIDE_LOCALE = 'pt-BR'`, opening `/` stays at `/`. Opening `/en/about` with an `es` preference stays in English.
- [x] 3.6 Add `src/lib/i18n/locale.svelte.ts`, the reactive `locale` updated after each navigation, and `src/lib/i18n/switch.ts` with `switchLocale(locale)`. `switchLocale` saves the preference, calls `setLocale(locale, { reload: false })`, then `goto(localizeCurrentUrl(page.url, locale))`, keeping the query string and the hash (design D11, addendum R7). Move the pure page-to-locale URL mapping out of `entryRedirect` into a shared `localizeCurrentUrl`.

  Add `src/lib/i18n/switch.svelte.test.ts` in the client project, with `$app/navigation` and `$app/state` mocked. It covers:
  - the `goto` targets for all pages and locales;
  - query and hash being kept;
  - storage being written;
  - `location.reload` and `location.assign` never being called.

  Verify with `bun run test`. Verify manually after task 4.2: in `bun run dev`, run `switchLocale('en')` from a temporary button on `/sobre`. The URL becomes `/en/about`, the text and `<html lang>` change, and the Network panel shows no document reload. Remove the temporary button afterwards.

## 4. Layout, pages, and messages

- [x] 4.1 Write the `app_*`, `nav_*`, and `meta_*` keys (design D6) with real translations in `messages/pt-BR.json`, `en.json`, and `es.json`. Verify with `bun run i18n:compile` and `bun run check`.
- [x] 4.2 Build `src/routes/+layout.svelte` (design D6, addendum R2):
  - import `../app.css`, which contains only the Tailwind import;
  - in this order: the block `<!-- @design-tokens:header -->`, then the minimal `<header>` with the app name and three nav links via `localizedPath`, then `<!-- /@design-tokens:header -->`; `<main id="main-content">{#key locale}{@render children()}{/key}</main>`; `<!-- @design-tokens:toaster -->`; `<!-- @pwa-seo:registration -->`;
  - an `$effect` that syncs `document.documentElement.lang` with `locale`.

  Verify with `bun run dev`: on `/es/como-usar`, the header links point to `/es/`, `/es/como-usar`, and `/es/acerca-de`, and `<main>` has `id="main-content"`. Also verify that `grep -c "@design-tokens:header\|@design-tokens:toaster\|@pwa-seo:registration" src/routes/+layout.svelte` prints `3` and that `<!-- /@design-tokens:header -->` closes the header block.
- [x] 4.3 Add the tool placeholder `src/routes/+page.svelte` (`app_tool_heading`, `app_tool_placeholder`, and the `meta_tool_*` head tags) and `src/routes/+error.svelte` (the not-found or generic error message, `meta_not_found_title`, and a link to the tool page in the active locale). Verify with `bun run preview`: `/es/unknown` shows the Spanish not-found page linking to `/es/`.
- [x] 4.4 Write the `page_how_to_use_*` keys in all three locales with real, short step-by-step content (design D6 content rules). Add `src/routes/how-to-use/+page.svelte`, which renders the steps as an ordered list, with the `meta_how_to_use_*` head tags. Verify with `bun run build`, then check that `build/como-usar.html`, `build/en/how-to-use.html`, and `build/es/como-usar.html` contain the localized heading.
- [x] 4.5 Write the `page_about_*` keys in all three locales. They must say that processing is local, images are never uploaded, there is no account or tracking, and the project is open source. Add `src/routes/about/+page.svelte` with the `meta_about_*` head tags. Verify with `bun run build`, then check that `build/sobre.html`, `build/en/about.html`, and `build/es/acerca-de.html` contain the privacy statement in their own language.
- [x] 4.6 Review every `.svelte` file this change created for user-visible literals, `aria-label`s, and titles that do not come from `m.*()`. Verify that `bun run lint` passes and that the review found no literal text.

## 5. Catalog completeness check

- [x] 5.1 Write `web/scripts/i18n-check.ts`:
  - a pure `checkCatalogs` function plus a CLI guarded by `import.meta.main`;
  - the CLI reads `settings.json` and `pathPattern`, ignores `$schema`, reports `missing`, `extra`, `empty`, and `missing-catalog`, and exits `1` or `0`.

  Add the `i18n:check` script. Verify that `bun run i18n:check` exits 0 on the real catalogs.
- [x] 5.2 Add `scripts/i18n-check.test.ts` covering every scenario of the "Catalog completeness check" requirement, and make sure the Vitest `include` covers `scripts/**`. Verify with `bun run test`. Also check by hand: deleting `nav_about` from `messages/es.json` makes `bun run i18n:check` exit non-zero and print `es: missing key nav_about`. Revert the deletion afterwards.

## 6. Build verification

- [x] 6.1 Write `web/scripts/verify-build.ts` and the `verify:build` script (design D8). It asserts:
  - the 9 HTML files and `404.html` exist;
  - each document has the expected `lang`;
  - the content pages contain their localized heading;
  - every root-relative `href`/`src` starts with `BASE_PATH`.

  Verify with `BASE_PATH=/Rusticker bun run build && BASE_PATH=/Rusticker bun run verify:build` (passes), and with the same build verified with `BASE_PATH=` (fails on the base check).
- [x] 6.2 Run the full local gate in `web/`: `bun run check && bun run lint && bun run test && bun run i18n:check && BASE_PATH=/Rusticker bun run build && BASE_PATH=/Rusticker bun run verify:build`. Verify that every command exits 0. Then, with `bun run preview` under the same base and scripts disabled in the browser, check that `/Rusticker/es/acerca-de` shows Spanish content.

## 7. CI and deployment

- [x] 7.1 Add `.github/workflows/web.yml` (design D9, addendum R1):
  - triggers on push to `main` or `develop` and on PRs targeting either, for `web/**`, `core/**`, `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, and the workflow file;
  - steps in this exact order: checkout; Bun pinned from `web/package.json`; Rust setup, wasm-pack install, and "Build wasm" (`wasm-pack build core --target web`), all guarded by `if: hashFiles('core/Cargo.toml') != ''`; `bun install --frozen-lockfile`; `i18n:compile`; `check`; `lint`; `bun run --if-present lint:design`; `test`; `i18n:check`; build with `BASE_PATH=/Rusticker`; `bun run --if-present seo:check`; `verify:build`.

  Verify:
  - the YAML parses (`bunx yaml-lint .github/workflows/web.yml`);
  - `bun run --if-present lint:design` exits 0 locally;
  - on the PR, the job passes and the three wasm steps show as skipped.
- [x] 7.2 Add `.github/workflows/deploy.yml` (design D9):
  - triggers on push to `main` (same path filters) and on `workflow_dispatch`;
  - Pages permissions and concurrency;
  - the same three guarded wasm steps before `bun install --frozen-lockfile`;
  - `i18n:compile` and `i18n:check`;
  - build with `BASE_PATH=/${{ github.event.repository.name }}` and `PUBLIC_SITE_URL: ${{ vars.PUBLIC_SITE_URL || format('https://{0}.github.io/{1}', github.repository_owner, github.event.repository.name) }}`;
  - `bun run --if-present seo:check`, then `verify:build`;
  - `configure-pages`, then `upload-pages-artifact` from `web/build`, then `deploy-pages`.

  Verify that the YAML parses. Once a remote exists and Pages is set to "GitHub Actions", check that the deployed `/<repo>/en/about` and `/<repo>/en` (redirecting to `/<repo>/en/`) load correctly.

## 8. Documentation

- [x] 8.1 Update only the web-scaffold sections of the docs:
  - **README:** Status, Quick start, and scripts table, with the real scripts (`check`, `lint`, `format`, `test`, `i18n:check`, `verify:build`). `build:wasm` and `dev:all` stay marked as coming with `wasm-pack`/`wasm-worker`. Also state the final slugs, set the hosting to GitHub Pages with `BASE_PATH`, and adjust roadmap row 3 so shadcn-svelte, theme, and icons are listed under `design-tokens`.
  - **DESIGN.md Part 2:** the final slug table, the Paraglide config path `web/project.inlang/settings.json`, the locale strategy and entry redirect, and `i18n:check` in CI via `web.yml`.
  - **CONTRIBUTING "Adding a locale":** add the step "add slugs for the locale in `web/src/lib/i18n/routes.js`" and remove the "after web-scaffold" markers that no longer apply.

  Verify that `grep -n "slugs to be finalized\|undecided" README.md DESIGN.md ARCHITECTURE.md` shows no stale web-scaffold wording in the edited sections.
- [x] 8.2 Add one CHANGELOG bullet under `Unreleased` / `Added`, for example "Static SvelteKit web app shell with localized routes (pt-BR, en, es), catalog check, CI, and GitHub Pages deployment". Verify that `git diff CHANGELOG.md` shows exactly one added bullet.
- [x] 8.3 Final validation. Verify that `openspec validate web-scaffold --strict` passes and that the full gate from 6.2 still exits 0.

## 9. End-to-end tests (approved scope addition, design D13)

- [x] 9.1 Add Playwright with `bunx sv add playwright` and normalize the result: remove the demo route, keep `test` as Vitest only, set `test:e2e` to `playwright test`, and ignore `test-results/`, `playwright-report/`, and `blob-report/` in `web/.gitignore` and `.prettierignore`. Run `bunx playwright install chromium`. Verify that `bun run lint`, `bun run check`, and `bun run test` still pass.
- [x] 9.2 Add `web/scripts/serve-pages.ts` (the GitHub Pages rules: base path, `<path>.html`, directory index, `/en` → `/en/` redirect, `404.html` with status 404) and `web/playwright.config.ts` (`testDir: 'e2e'`, Chromium, `webServer` that builds with `BASE_PATH=/Rusticker` and `VITE_E2E_HOOKS=true` and then serves `build/`, `baseURL` `http://localhost:4173/Rusticker/`, traces on the first retry, one retry on CI). Add the `VITE_E2E_HOOKS` hook in `src/hooks.client.ts`. Verify that a normal `BASE_PATH=/Rusticker bun run build` contains no `__rusticker_e2e`.
- [x] 9.3 Write the specs under `web/e2e/web-scaffold/`:
  - entry redirect by saved preference and by browser language, including "prefix wins without overwriting the preference" and query/hash preservation;
  - `switchLocale` without a document reload (no extra document request; URL, text, header, `<html lang>`, and preference updated);
  - `/en` → `/en/`, the localized not-found page with its link back, and an untranslated slug under a prefix;
  - the Spanish about page with JavaScript disabled;
  - same-origin requests only.

  Verify with `MSYS_NO_PATHCONV=1 bun run test:e2e`: every test passes.
- [x] 9.4 CI and docs: in `.github/workflows/web.yml`, after `verify:build`, cache `~/.cache/ms-playwright` keyed on the Playwright version, run `bunx playwright install --with-deps chromium` and `bun run --if-present test:e2e`, and upload `web/playwright-report/` on failure (not in `deploy.yml`). Document `bun run test:e2e` in CONTRIBUTING. Verify that the YAML parses (`bunx yaml-lint .github/workflows/web.yml`) and that `openspec validate web-scaffold --strict` passes.
- [x] 9.5 Pre-wire a second Playwright project so later changes never edit `playwright.config.ts`: `pages` ignores `**/*.dev.spec.ts`; `dev` runs only `**/*.dev.spec.ts` against `bun run dev --port 5173 --strictPort` (`BASE_PATH` empty, `baseURL` `http://localhost:5173/`), and each project's web server starts only when that project is selected. Add `e2e/web-scaffold/dev-server.dev.spec.ts` and document the `*.dev.spec.ts` convention in CONTRIBUTING. Verify that `bun run test:e2e` passes both projects and that `--project=pages` does not start the dev server.
