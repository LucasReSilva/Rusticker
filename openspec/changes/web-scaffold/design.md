## Context

`web/` does not exist yet. The repository holds only docs, OpenSpec config, the Rust toolchain pin, and Git hooks (see `openspec/specs/repository-foundation`). The root `.gitignore` already ignores `node_modules/`, `web/.svelte-kit/`, and `web/build/`. This change runs in Wave A, in parallel with `core-detection`, so it cannot import or build `core/pkg`. The shared contract fixes several inputs:

- hosting on GitHub Pages;
- the `BASE_PATH` environment variable;
- the `404.html` fallback;
- the translated slugs;
- the message-key prefixes;
- file ownership.

Later changes edit some of the files created here (`+layout.svelte`, `vite.config.ts`, `package.json`, both workflows). The layout of those files has to make such additions small and conflict-free. Motivation is in proposal.md; required behavior is in `specs/web-app-shell` and `specs/localization`.

## Goals / Non-Goals

**Goals:**
- One source of truth for page slugs, used by routing, link generation, prerender entries, and tests.
- Deterministic prerendering: a page's HTML depends only on its URL, never on cookies or headers.
- Locale preference and browser-language logic as small pure functions that are unit-tested without a browser.
- CI that runs on a clean checkout without Rust, wasm-pack, or `core/pkg`.
- A layout that leaves clear insertion points for `design-tokens`, `wasm-worker`, `pwa-seo`, and `tool-ui`.

**Non-Goals:**
- Visual design. The header and pages are semantic HTML with no utility classes or styles; `design-tokens` styles them.
- `hreflang`, sitemap, canonical links (`pwa-seo`).
- Any UI for choosing a locale (`design-tokens` adds `LanguageSwitcher`). This change only provides `switchLocale` (D11) and the read helpers.
- Component tests in a real browser. Component tests run in jsdom (D12); a browser project can be added later without changing the specs.

## Decisions

### D1. Scaffold with the official CLI, then normalize to Bun

From the repo root:

```sh
bunx sv create web --template minimal --types ts --install bun --no-add-ons
cd web
bunx sv add tailwindcss paraglide eslint prettier vitest
```

Add-on choices:

- **Paraglide:** languages `pt-BR,en,es`, no demo page.
- **Vitest:** do not choose a real-browser component project, because it would make CI download browsers. Configure the `server` and `client` (jsdom) projects by hand instead (D12).
- **Tailwind:** no plugins.

After running the CLI:

- Replace any `npm run` / `npx` in generated scripts with `bun run` / `bunx`.
- Set `"packageManager": "bun@<installed version>"` so CI pins the same Bun.
- Commit `bun.lock`.

The shadcn-svelte init is **not** run here; it belongs to `design-tokens`.

*Alternative:* hand-write the config. Rejected: the CLI output is the upstream-supported baseline, and later changes run `sv`/`shadcn-svelte` commands that expect it.

### D2. Static output, base path, and trailing slashes

`svelte.config.js`:

- `adapter-static` with `pages: 'build'`, `assets: 'build'`, `fallback: '404.html'`, and `strict: true`.
- `paths.base` reads `process.env.BASE_PATH ?? ''`. The value must be `''`, or must start with `/` and not end with `/`; anything else makes the config throw at build time. A typo in the workflow then fails loudly instead of producing broken links.
- `prerender.entries` is generated from the route table (D4): the 9 localized paths, written without the base, which SvelteKit prepends itself.
- `prerender.handleHttpError: 'fail'` and `handleMissingId: 'fail'`, so a broken localized link fails the build.

Route options:

| File                            | Options                                                                       |
|---------------------------------|-------------------------------------------------------------------------------|
| `src/routes/+layout.ts`         | `prerender = true`, `trailingSlash = 'never'`                                 |
| `src/routes/+page.ts` (tool)    | `ssr = false`, `prerender = true`, `trailingSlash = 'always'`                 |
| `how-to-use/`, `about/`         | inherit (prerendered with SSR, so the HTML contains the content)               |

**Why the tool prerenders an empty shell.** With `ssr = false` plus `prerender = true`, SvelteKit writes a script-only HTML shell per entry: `index.html`, `en/index.html`, and `es/index.html`. Compared with relying on `404.html` alone:

- the tool URLs return HTTP 200 instead of 404;
- each shell already has the right `<html lang>`.

The fallback stays as the safety net for every other URL (spec "SPA fallback for other URLs").

**Why the tool uses `trailingSlash = 'always'`.** On GitHub Pages, a file `en.html` next to a directory `en/` (which holds `en/how-to-use.html`) is shadowed by the directory, so `/en` would 404. With `trailingSlash = 'always'` the shells live at `en/index.html`, and Pages redirects `/en` to `/en/`. The generated hrefs for the tool therefore use `/en/` and `/es/`. Content pages stay slash-less (`en/how-to-use.html`, served for `/en/how-to-use`).

*Alternative:* `trailingSlash = 'always'` everywhere. Rejected: the contract's slugs have no trailing slash.

### D3. Paraglide configuration and locale strategy

- **Config path:** `web/project.inlang/settings.json`:
  - `baseLocale: "pt-BR"`;
  - `locales: ["pt-BR", "en", "es"]`;
  - modules: the inlang message-format plugin and the m-function matcher;
  - `plugin.inlang.messageFormat.pathPattern: "./messages/{locale}.json"`.
- **Catalogs:** `web/messages/{locale}.json`.
- **Compiled output:** `web/src/lib/paraglide/`, git-ignored in `web/.gitignore` and excluded from ESLint and Prettier. This is the path CONTRIBUTING's "Adding a locale" already names, so that section only needs the slug note (task 8).
- **Strategy:** `['url', 'localStorage', 'baseLocale']`. The Vite plugin also receives `urlPatterns` (D4).
  - `url` comes first, and the patterns cover every URL, including the unprefixed ones, which map to `pt-BR`. The locale used for rendering therefore depends only on the URL, which keeps prerendering deterministic.
  - `localStorage` is listed so that Paraglide reads and writes the choice under its own key (`PARAGLIDE_LOCALE`). Switching is done only through `switchLocale` (D11), never through Paraglide's reloading `setLocale(locale)`.
  - `cookie` is dropped: a static host cannot read it, and a cookie would be sent with every request for no benefit.
  - `preferredLanguage` is dropped: Paraglide matches only on the primary subtag, so `pt-PT` would not match `pt-BR`. The negotiation in D5 handles browser languages instead.
- **`src/hooks.server.ts`:** `export const handle = sequence(paraglideHandle, /* @pwa-seo:handle */)` (addendum R3). `paraglideHandle` wraps `paraglideMiddleware` with a `transformPageChunk` that replaces `%paraglide.lang%` in `app.html`'s `<html lang="%paraglide.lang%">`. `pwa-seo` inserts its head-tags handle at the anchor and changes nothing else. This runs during prerendering, so every generated document, including `404.html` (always `pt-BR`), carries a `lang`.
- **`src/hooks.ts`:** `reroute = ({ url }) => deLocalizeUrl(url).pathname`.

### D4. One route table; internal route directories in English

- **Route directories** are English and locale-neutral: `src/routes/+page.svelte` (tool), `src/routes/how-to-use/`, `src/routes/about/`. Localized slugs exist only in the data, which keeps repository identifiers in English (AGENTS.md).
- **`src/lib/i18n/routes.js`** (plain ESM with JSDoc types, so `svelte.config.js`, `vite.config.ts`, the app, and tests can all import it) exports the slug table from the contract:

  ```js
  /** @type {Record<'tool'|'howToUse'|'about', Record<'pt-BR'|'en'|'es', string>>} */
  export const pages = {
    tool:     { 'pt-BR': '/',          en: '/en/',            es: '/es/' },
    howToUse: { 'pt-BR': '/como-usar', en: '/en/how-to-use', es: '/es/como-usar' },
    about:    { 'pt-BR': '/sobre',     en: '/en/about',      es: '/es/acerca-de' },
  };
  ```

  It also exports `internalPath` (`/`, `/how-to-use`, `/about`) and two helpers:
  - `buildUrlPatterns(base)`: one pattern per page, each prefixed with the base path. The tool patterns accept the URL with or without the trailing slash. After the page patterns comes a final catch-all per locale, listed in the order `/en/*`, `/es/*`, then the unprefixed `/*`. The catch-all makes unknown URLs under `/es/...` resolve to `es` and render the Spanish not-found page.
  - `prerenderEntries()`: the 9 localized paths.
- **Links:** `src/lib/i18n/links.ts` exports `localizedPath(page, locale = getLocale())`, which returns `base + pages[page][locale]`. It reads the table directly instead of round-tripping through pattern matching, so links are predictable.
- **Untranslated slugs:** an internal path such as `/how-to-use` or `/en/sobre` is never linked or prerendered. If someone requests it, the fallback renders whatever the patterns resolve. For `/en/sobre` that is the English not-found page (spec scenario "Untranslated slug under a prefix").

*Alternative:* Paraglide's default prefix-only patterns. Rejected: the contract requires translated slugs.

### D5. Entry redirect for unprefixed URLs (preference, then browser language)

The decision logic is pure and lives in `src/lib/i18n/`, with unit tests:

- **`preference.ts`**: `readSavedLocale(): Locale | undefined` and `saveLocalePreference(locale)`. Both read and write `localStorage[PARAGLIDE_LOCALE]`, wrapped in `try/catch` so blocked storage counts as "no preference". Values that are not supported locales are ignored.
- **`negotiate.ts`**: `matchBrowserLocale(languages: readonly string[]): Locale | undefined`. For each tag, in order, it first tries a case-insensitive exact match, then a match on the primary subtag (`en-US` matches `en`, `es-419` matches `es`, `pt`/`pt-PT` match `pt-BR`).
- **`entry-redirect.ts`**: `entryRedirect(url, base, saved, languages): string | undefined`.
  1. If the path carries a locale prefix, it returns `undefined`.
  2. Otherwise it computes the target locale as `saved ?? matchBrowserLocale(languages) ?? 'pt-BR'`. If that is `pt-BR`, it returns `undefined`.
  3. Otherwise it maps the current page to the same page in the target locale through the route table, keeping the query string and the hash. An unknown path maps to the same path under the locale prefix, which then renders the localized not-found page.

`src/hooks.client.ts` calls this from SvelteKit's client `init` hook, which runs once per document load and before hydration. If there is a target, it calls `location.replace(target)`. In-app navigations never go through `init`, so links and history navigation never redirect (spec "Locale resolution order").

`<html lang>` on the client: the root layout keeps `document.documentElement.lang` in sync with `getLocale()` through an `$effect`. This covers documents served from `404.html`, whose static `lang` is `pt-BR`.

*Alternative:* an inline script in `app.html` that redirects before first paint. Rejected for now: it would duplicate the slug table outside the typed module. The cost is a short flash of `pt-BR` content (see Risks).

### D6. Layout, header, pages, and messages

- **`src/routes/+layout.svelte`** (addendum R2) imports `../app.css` (Tailwind import only). Its markup, in order:

  ```svelte
  <!-- @design-tokens:header -->
  <header><a href={localizedPath('tool')}>{m.app_name()}</a><nav aria-label={m.nav_label()}>…3 links…</nav></header>
  <!-- /@design-tokens:header -->
  <main id="main-content">{#key locale}{@render children()}{/key}</main>
  <!-- @design-tokens:toaster -->
  <!-- @pwa-seo:registration -->
  ```

  - `design-tokens` replaces the whole block from `<!-- @design-tokens:header -->` to `<!-- /@design-tokens:header -->`; whether the markers are kept is its choice. It also replaces the toaster anchor.
  - `pwa-seo` replaces the registration anchor.
  - `id="main-content"` is the target of the skip link that `design-tokens` adds.
  - `locale` is the reactive locale (D11). The `{#key}` re-renders the page after a switch. The header re-renders as well, because its message calls read `locale`. The same value drives the `$effect` that sets `document.documentElement.lang`.
- **Pages:** each sets `<svelte:head>` with its `meta_*_title` and `meta_*_description`.
  - The tool placeholder shows `app_tool_heading` and `app_tool_placeholder`.
  - `+error.svelte` shows a localized not-found message (status 404) or a generic error, with a link to the tool page in the active locale.
- **Message keys:** all of them exist in all three catalogs, with real translations. No HTML inside messages; lists are separate keys rendered as `<ol>`/`<p>`.

  | Prefix | Keys |
  |---|---|
  | `app_*` | `app_name`, `app_tool_heading`, `app_tool_placeholder`, `app_not_found_title`, `app_not_found_body`, `app_error_title`, `app_error_body`, `app_back_to_tool` |
  | `nav_*` | `nav_label`, `nav_tool`, `nav_how_to_use`, `nav_about` |
  | `meta_*` | `meta_tool_title`, `meta_tool_description`, `meta_how_to_use_title`, `meta_how_to_use_description`, `meta_about_title`, `meta_about_description`, `meta_not_found_title` |
  | `page_how_to_use_*` | `_heading`, `_intro`, `_step_prepare`, `_step_open`, `_step_adjust`, `_step_download`, `_step_import`, `_import_note` |
  | `page_about_*` | `_heading`, `_intro`, `_privacy_heading`, `_privacy_body`, `_no_account_body`, `_open_source_body` |

- **Content rules:**
  - **How-to-use:** the steps describe the flow that the later changes deliver: prepare an image on a uniform background, open Rusticker and add the image, check or adjust the background color and tolerance, download the `.zip`, and import the pack into WhatsApp on the phone with a sticker-pack importer app. The import note explains that a pack needs 3 to 30 stickers. The text names no specific third-party app.
  - **About:** images are processed on the device and never uploaded; there is no account and no tracking; the project is open source (MIT).
  - Neither page claims offline support yet; `pwa-seo` adds that.

### D7. Catalog completeness check

`web/scripts/i18n-check.ts` runs with `bun scripts/i18n-check.ts` (script `i18n:check`).

- **Pure part:** `checkCatalogs(base, catalogs)` returns a list of problems: `missing`, `extra`, `empty`, or `missing-catalog`.
- **CLI wrapper:** guarded by `import.meta.main`. It does the following:
  1. reads `project.inlang/settings.json` to get the base locale, the locales, and `pathPattern`;
  2. loads each catalog, ignoring the `$schema` key;
  3. prints one line per problem (`es: missing key nav_about`);
  4. exits `1` if there are problems and `0` otherwise.
- **Empty values:** a string value that is empty or only whitespace counts as empty. A variant/plural value counts as empty if it has no variants or any variant is empty.
- **Tests:** a Vitest unit test covers each spec scenario of "Catalog completeness check". The test runs in the `server` project under Node, where `import.meta.main` is undefined, so importing the module has no side effects.

*Alternative:* inlang lint rules. Rejected: they add tooling for a check that takes about 60 lines, and the check would no longer be readable as a plain script.

### D8. Scripts and verification helpers

`web/package.json` scripts:

| Script | Command (summary) |
|---|---|
| `dev` / `build` / `preview` | Vite |
| `i18n:compile` | `paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` |
| `prepare` | `svelte-kit sync && bun run i18n:compile` (tolerant of failure, as the sv default is) |
| `check` | `bun run i18n:compile && svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` |
| `lint` | `prettier --check . && eslint .` |
| `format` | `prettier --write .` |
| `test` | `vitest run`, both projects (`test:unit` = watch mode) |
| `i18n:check` | `bun scripts/i18n-check.ts` |
| `verify:build` | `bun scripts/verify-build.ts` |

`check`, `lint`, and `test` run before any `vite build`, which is why they need the compiled Paraglide output, and why `i18n:compile` exists.

`scripts/verify-build.ts` inspects `build/` after a build and asserts the following:

- the 9 expected HTML files and `404.html` exist;
- each generated document has the expected `lang`;
- the content pages contain their localized heading text (read from the catalogs);
- every `href`/`src` that starts with `/` also starts with `BASE_PATH`.

It turns the spec's build-level scenarios into a CI check.

### D9. CI and deploy workflows (pre-wired for the whole roadmap)

Addendum R1: these files are written once, here. Wave B and C changes never edit them; they add the scripts that the steps call. Both workflows use `defaults.run.working-directory: web` for the Bun steps.

**Shared wasm steps.** These three steps appear in both workflows, guarded by `if: hashFiles('core/Cargo.toml') != ''`, and run before `bun install`:

1. set up Rust from `rust-toolchain.toml` (rustup reads the file);
2. install wasm-pack;
3. "Build wasm": `wasm-pack build core --target web`, run from the repo root.

On this change's branch `core/` does not exist yet, so all three are skipped. They take effect as soon as `core-detection` and `wasm-worker` are merged.

**`.github/workflows/web.yml`**

- Triggers: `push` to `develop` and `develop`, and `pull_request` targeting either. Path filters: `web/**`, `core/**`, `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, and `.github/workflows/web.yml`.
- One job on `ubuntu-latest`. Steps, in this exact order:
  1. checkout;
  2. `oven-sh/setup-bun` with `bun-version-file: web/package.json`;
  3. the three guarded wasm steps;
  4. `bun install --frozen-lockfile`;
  5. `bun run i18n:compile`, `bun run check`, `bun run lint`;
  6. `bun run --if-present lint:design`, which does nothing until `design-tokens` defines `lint:design`;
  7. `bun run test`, `bun run i18n:check`;
  8. build with `BASE_PATH=/Rusticker`, which exercises a non-empty base;
  9. `bun run --if-present seo:check` (a no-op until `pwa-seo` defines it);
  10. `BASE_PATH=/Rusticker bun run verify:build`.

**`.github/workflows/deploy.yml`**

- Triggers: `push` to `main` (same path filters, with this workflow file in place of `web.yml`) and `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- `concurrency: { group: pages, cancel-in-progress: false }`.
- Job `build`. Steps:
  1. checkout and setup-bun;
  2. the three guarded wasm steps;
  3. `bun install --frozen-lockfile`;
  4. `bun run i18n:compile` and `bun run i18n:check`;
  5. the build, with this environment:
     - `BASE_PATH: /${{ github.event.repository.name }}`;
     - `PUBLIC_SITE_URL: ${{ vars.PUBLIC_SITE_URL || format('https://{0}.github.io/{1}', github.repository_owner, github.event.repository.name) }}`, which `pwa-seo` consumes; this change does not read it;
  6. `bun run --if-present seo:check`, then `verify:build`;
  7. `actions/configure-pages`;
  8. `actions/upload-pages-artifact` with `path: web/build`.
- Job `deploy`: `actions/deploy-pages` in the `github-pages` environment.

The artifact-based Pages deployment does not run Jekyll, so `_app/` is served without a `.nojekyll` file.

### D10. Privacy

- The only persistent state is one `localStorage` key holding a locale code.
- There are no cookies, analytics, fonts from CDNs, or third-party requests.
- The workflows publish only the build output.

Nothing in this change can send user data off the device.

### D11. `switchLocale`: switching language without a reload (addendum R7)

- **Reactive locale: `src/lib/i18n/locale.svelte.ts`.** It holds `locale` as rune state. The value is initialized from `getLocale()` and updated after every navigation from the URL (`afterNavigate` plus `extractLocaleFromUrl`). Components read this value instead of calling `getLocale()` directly, so locale changes are tracked.
- **`switchLocale(locale): Promise<void>` in `src/lib/i18n/switch.ts`.** It runs these steps in order:
  1. `saveLocalePreference(locale)`, which writes `PARAGLIDE_LOCALE` and tolerates blocked storage;
  2. `setLocale(locale, { reload: false })`;
  3. compute the target with `localizeCurrentUrl(page.url, locale)`, the same pure mapping that `entryRedirect` uses. It maps a page to its counterpart in the target locale, an unknown path to the same path under the target prefix, and keeps the query string and the hash;
  4. `await goto(target)`, an in-app navigation;
  5. update the reactive `locale`.

  The root layout's `{#key locale}` then remounts the page with the new messages, and the `lang` effect updates `<html lang>`. There is no full reload, so module-scope state survives. `tool-ui` keeps its editor state at module scope for exactly this reason.
- **Calling contract.** `design-tokens`' `LanguageSwitcher` calls `switchLocale`. Nothing else should call Paraglide's `setLocale` directly.
- **Tests.** A `client`-project test mocks `$app/navigation` and checks:
  - the `goto` target for each page and locale, including query and hash;
  - that storage is written;
  - that `location.reload` and `location.assign` are never called.

  The no-reload behavior on a real page is checked manually in task 3.6.

*Alternative:* Paraglide's default `setLocale`, which reloads the page. Rejected: a reload would discard the user's image and stickers on the tool page.

### D12. Vitest projects (addendum R4)

`vite.config.ts` declares `test.projects` with two projects:

- **`server`:** environment `node`. It includes `src/**/*.{test,spec}.{js,ts}` and `scripts/**/*.{test,spec}.ts`, and excludes `src/**/*.svelte.{test,spec}.{js,ts}`.
- **`client`:** environment `jsdom`. It includes `src/**/*.svelte.{test,spec}.{js,ts}`, uses `resolve.conditions: ['browser']`, and has a setup file `vitest-setup-client.ts` that registers `@testing-library/jest-dom/vitest`.

Dev dependencies: `jsdom`, `@testing-library/svelte`, `@testing-library/jest-dom`.

One smoke test proves the client project works: `src/lib/i18n/switch.svelte.test.ts` (D11). Later changes only add test files that follow these naming rules.

## Risks / Trade-offs

- **[Paraglide URL patterns combined with a non-empty base path behave unexpectedly]** → Patterns are generated from one function and unit-tested against all 9 URLs, with base `''` and with `/Rusticker`. `verify-build.ts` and `bun run preview` with `BASE_PATH=/Rusticker` check the real output. If needed, the fallback is to match on the base-stripped path in `reroute`.
- **[GitHub Pages trailing-slash handling differs from what D2 assumes]** → The tool shells sit at `*/index.html`, which Pages serves for both `/en` and `/en/`. Test after the first deploy. Note for `pwa-seo`: the canonical tool URLs are `/en/` and `/es/`.
- **[`{#key locale}` remounts the whole page on a switch, losing component-local state such as focus or scroll]** → Locale switches are rare and explicit. Feature state lives at module scope (addendum R7), and the switcher keeps its own focus because it sits in the header, outside the key.
- **[The guarded wasm steps cannot run on this branch, because `core/` is absent]** → Their YAML is reviewed here, and their first real run is when the `wasm-worker` PR's CI runs. `wasm-worker` has a task that verifies they run.
- **[Flash of `pt-BR` content before the entry redirect]** → It happens only on a full load of an unprefixed URL when the preference or browser language differs from `pt-BR`. The redirect runs in `init` before hydration, and the content pages are short. An inline pre-paint redirect can be added later without changing the specs.
- **[A `pt-BR` link shared with an English-browser user redirects to English]** → This is intended by the resolution order in the brief. Once a `pt-BR` preference is saved (`switchLocale`, called by the `design-tokens` switcher), the redirect stops.
- **[Fallback-served URLs return HTTP 404 on GitHub Pages]** → All public URLs are prerendered and return 200. Only unknown or non-canonical URLs go through `404.html`.
- **[CLI add-on output drifts between versions]** → Exact versions are locked in `bun.lock`. Task 1 records the `sv` version used.
- **[Running `check`, `lint`, or `test` before Paraglide has compiled fails]** → Handled by the `i18n:compile` step (D8).
- **[Hardcoded strings slip into components]** → No reliable lint rule exists for Svelte text nodes. Enforcement relies on review, on `verify-build` asserting localized content per locale, and on the catalogs being the only source of text in this change's files.

## Migration Plan

This is a new app with nothing to migrate. Rollout:

1. Merge `feature/web-scaffold` into `develop` via PR; `web.yml` must pass. The first deploy happens when a release is merged into `main`.
2. Once a GitHub remote exists, set Pages to "GitHub Actions" as the source. `deploy.yml` then publishes on the next push.

Rollback: revert the merge commit. Pages keeps serving the last successful deployment until a new one runs.

## Open Questions

- **Repository name and site type.** The deploy uses `/${{ github.event.repository.name }}`. If the site is ever published as a user/organization site (`<user>.github.io`) or under a custom domain, `BASE_PATH` must be set to `''` in `deploy.yml`. This is deferrable: there is no remote yet.
- **Trailing slash on the tool URL (confirmed by addendum R5).** The canonical tool URLs are `/`, `/en/`, and `/es/`, and `/en` and `/es` redirect on Pages. Content pages have no trailing slash. This matches D2 and D4.
- **Ownership clarification, not a contract change.** This change also creates the following files under its `web/**` scaffold ownership:
  - `src/hooks.client.ts`;
  - `src/lib/i18n/**`, including `switchLocale` and the reactive `locale`, which `design-tokens`' `LanguageSwitcher` consumes;
  - `vitest-setup-client.ts`;
  - `src/routes/+error.svelte`;
  - `scripts/verify-build.ts`.

  The docs also change: DESIGN.md currently says `i18n:check` is wired into CI by `pwa-seo`. Under the contract, `web-scaffold` does it, and task 8 updates that sentence.
