## Context

See proposal.md (Why). State after Wave A (`web-scaffold` merged):

- `web/` is SvelteKit 2 + adapter-static, `fallback: '404.html'`, `paths.base` from env `BASE_PATH` (e.g. `/Rusticker` in the deploy workflow, empty in dev).
- Paraglide JS with `pt-BR` (base, unprefixed), `en`, `es`, and translated slugs (shared contract table). Paraglide's URL patterns are the single source of truth for localized paths; `web-scaffold` also emits `<html lang>`, `<title>` and meta description from `meta_*`.
- Content pages (how-to-use, about) are prerendered per locale. The tool page has `ssr = false` and is prerendered as a shell per locale (`index.html`, `en/index.html`, `es/index.html`; canonical URLs `/`, `/en/`, `/es/` with trailing slash, content pages without). A shell's `<svelte:head>` content is only added after scripts run.
- Locale switching never reloads the page: `web-scaffold`'s `switchLocale` client-navigates to the localized href (contract R7).
- CI is pre-wired by `web-scaffold`: `web.yml` runs `bun run --if-present seo:check` after a build with `BASE_PATH` set, and `deploy.yml` sets `PUBLIC_SITE_URL` (contract R1). `+layout.svelte` has a `<!-- @pwa-seo:registration -->` anchor and `hooks.server.ts` a `/* @pwa-seo:handle */` anchor inside `sequence(...)` (R2, R3).
- Running in parallel: `design-tokens` (owns the toast component and colors) and `wasm-worker` (emits the `.wasm` as a hashed static asset and a module worker chunk under `_app/immutable/`). This change must build and pass its checks without either.
- GitHub Pages serves `foo.html` for `/foo`, and `404.html` (with HTTP status 404) for any unknown path.

## Goals / Non-Goals

**Goals:**
- Installable, fully offline app under any base path, with per-locale install texts.
- Static HTML of every public page (including client-rendered tool shells) carries canonical + hreflang + `x-default`.
- One source of truth for localized URLs (Paraglide) feeding head tags, sitemap and manifests.
- A CI-runnable build-output check that proves the above.

**Non-Goals:**
- Visible PWA UI (update toast, install button). Only an internal signal is exposed; the toast is deferred and not assigned to any change.
- Runtime caching strategies for third-party or cross-origin resources (there are none).
- Final brand icon and theme colors.

## Decisions

### D1. Service worker via `@vite-pwa/sveltekit`, `generateSW`, precache-only
Workbox `generateSW` with no `runtimeCaching`. Key options (in a separated `// --- pwa-seo ---` block of `vite.config.ts`):
- `registerType: 'prompt'`, `injectRegister: false` (we register manually, D3), `manifest: false` (we serve our own per-locale manifests, D4), `devOptions.enabled: false`.
- `scope` / `base`: `${BASE_PATH}/`; `kit: { base: BASE_PATH, adapterFallback: '404.html', trailingSlash: <same as svelte.config> }` so prerendered `*.html` map to clean URLs.
- `workbox.globPatterns`: `client/**/*.{js,css,ico,png,svg,webp,woff2,wasm,webmanifest}` and `prerendered/**/*.{html,webmanifest}` (exact directory prefixes follow the plugin's SvelteKit defaults). A pattern with no match (e.g. `wasm` before `wasm-worker` merges) only produces a Workbox warning, not a failure, which gives the "tolerates absence" behavior for free.
- `workbox.globIgnores`: `**/_*/**`, `**/_*.html` (dev routes), `**/sitemap.xml`, `**/robots.txt`.
- `workbox.maximumFileSizeToCacheInBytes`: 10 MiB, because the default 2 MiB would silently skip a large `.wasm`.
- `workbox.navigateFallback`: `${BASE_PATH}/404.html` (the adapter's SPA fallback), with `navigateFallbackDenylist` for `sitemap.xml`, `robots.txt`, `*.webmanifest`, and `/_` paths.
- Alternatives: `injectManifest` with a hand-written SW — more code, no need for custom fetch logic. A hand-rolled SvelteKit `service-worker.ts` — loses Workbox's revisioning and clean-URL handling and needs manual prerendered-page listing.

### D2. Update strategy: prompt, without UI for now
`autoUpdate` in this plugin calls `skipWaiting` + `clientsClaim` and reloads open pages when the new SW takes control; a reload mid-session would destroy detected stickers that only live in memory. With `prompt`, the new SW waits; the browser activates it once every app window is closed (standard SW lifecycle), satisfying "Updates never interrupt a session". `web/src/lib/pwa/` exposes `needRefresh` (a rune-backed readable) and `applyUpdate()` (calls `updateServiceWorker(true)`) so a future toast can be added without touching the SW config. Alternative: autoUpdate + "don't reload" — not supported cleanly and leaves pages running against a mismatched precache.

### D3. Registration from the root layout
`web/src/lib/pwa/PwaRegistration.svelte` imports `virtual:pwa-register` in `onMount` (browser only) with `immediate: true`; renders nothing. Wired by replacing only the `<!-- @pwa-seo:registration -->` anchor of `+layout.svelte` with `<PwaRegistration />` (plus its import). The same component also runs the head-tag updater of D5 after client-side navigations. No visible text, so no messages besides `pwa_*`. In dev the virtual module is a no-op because `devOptions.enabled` is false.

### D4. Per-locale manifests generated at build time from the catalogs
Prerendered endpoint `src/routes/manifest-[locale].webmanifest/+server.ts` with `entries()` returning every locale from Paraglide's runtime (`locales`), `prerender = true`, `Content-Type: application/manifest+json`. The JSON is built by `web/src/lib/seo/manifest.ts` (pure, unit-tested) using `m.pwa_name({}, { locale })` etc.:
- shared: `id: "${base}/"`, `scope: "${base}/"`, `display: "standalone"`, icons (`${base}/icons/...`), `theme_color` / `background_color` (D9);
- per locale: `name`, `short_name`, `description`, `lang`, `dir: "ltr"`, `start_url` = the locale's tool URL from the URL helper (D6).
Each page links `${base}/manifest-<locale>.webmanifest` (D5). Same `id` + `scope` means one installed app regardless of the locale it was installed from; the OS shows the name of the locale used at install time.
Alternatives: (a) one base-locale manifest + documented limitation — violates the brief ("textos do manifest do PWA" in messages, per locale). (b) Manifests generated by a Vite plugin hook — SvelteKit's two-pass build and Paraglide compilation make that fragile; a prerendered endpoint reuses the compiled messages directly. (c) Per-locale `scope` (`/en/`) — would make the installed English app treat `pt-BR` pages as out-of-scope.

### D5. SEO head tags injected by a server `handle`, kept current by a client updater
`web/src/lib/seo/handle.ts` exports `seoHandle: Handle` that calls `resolve(event, { transformPageChunk })` and inserts, right before `</head>`: canonical link, 3 `hreflang` alternates + `x-default`, the locale manifest link, `apple-touch-icon`, and `theme-color` meta. It runs during prerender for every page, including `ssr = false` shells, so static HTML is complete for crawlers that do not run scripts and for `seo:check`. It skips when `event.route.id` is null (the `404.html` fallback) or starts with `/_`, and when the response is not HTML.
Every injected element carries `data-pwa-seo`. Wiring: insert `seoHandle` at the `/* @pwa-seo:handle */` anchor in `web/src/hooks.server.ts` (accepted in contract R3).
Why not the contract's `<svelte:head>` component in `+layout.svelte`: in `ssr = false` shells (all three tool URLs, i.e. the most important landing pages) head content exists only after hydration; the static HTML would have no hreflang. Using both would duplicate tags on SSR pages. Client-side navigation (including locale switches, which never reload per R7) would leave the first page's tags in the DOM, so an install started after switching to English would use the pt-BR manifest. `PwaRegistration` therefore subscribes to `afterNavigate` and rewrites the `data-pwa-seo` elements in place (canonical, alternates, manifest `href`) using the same pure builder as the handle (`web/src/lib/seo/head.ts`), so server and client output cannot diverge.

### D6. One URL helper on top of Paraglide
`web/src/lib/seo/urls.ts`:
- `PUBLIC_PAGES`: the base-locale paths `['/', '/como-usar', '/sobre']` (the only hand-maintained list; new public pages are added here).
- `localizedPath(path, locale)`: delegates to Paraglide's `localizeHref` (base-relative), so translated slugs come from `web-scaffold`'s URL patterns; `pageFromUrl(url)` uses `deLocalizeHref` to find the page of the current request.
- `absoluteUrl(path)`: `SITE_URL` + path, with exactly one base path (SITE_URL already includes it; the path must not). Unit test asserts the full 9-URL contract table so a slug drift in Paraglide config fails tests.
- `alternates(path)`: `[{ hreflang: locale, href }] for locale of locales` + `{ hreflang: 'x-default', href: <baseLocale URL> }`. Iterating Paraglide's `locales` gives "new locale needs no SEO code change".

### D7. Site origin from `PUBLIC_SITE_URL`, build-time only
The PWA/SEO block of `vite.config.ts` reads `process.env.PUBLIC_SITE_URL` and exposes it with Vite `define` as `__SITE_URL__`, declared with `declare const` in `web/src/lib/seo/site.ts` (not in `src/app.d.ts`, to stay within owned files). Fallback when unset: `http://localhost:4173${BASE_PATH}` with a `console.warn` at build. Trailing slash is stripped.
Why not `$env/static/public`: a missing variable is a build error, which breaks local builds; `$env/dynamic/public` cannot be read during prerendering in SvelteKit 2.
No workflow edit: `deploy.yml` (pre-wired by `web-scaffold`, R1) already sets `PUBLIC_SITE_URL: ${{ vars.PUBLIC_SITE_URL || format('https://{0}.github.io/{1}', github.repository_owner, github.event.repository.name) }}`; a custom domain only needs the repository variable.

### D8. Sitemap and robots as prerendered endpoints
`src/routes/sitemap.xml/+server.ts` and `src/routes/robots.txt/+server.ts`, `prerender = true`, built from D6. Sitemap uses the `xhtml:link rel="alternate" hreflang` extension per `<url>` (Google's recommended way to declare locale clusters), no `lastmod` (no reliable per-page date; omitting is valid). robots.txt: `User-agent: *`, `Allow: /`, `Sitemap: <SITE_URL>/sitemap.xml`. If the scaffold shipped `web/static/robots.txt`, it is deleted (a static file and a route at the same path conflict at build). Both paths contain no locale prefix and must be passed through by Paraglide's reroute; the task verifies the files land in `build/` unchanged.

### D9. Icons and colors
`web/static/icons/icon.svg` (simple placeholder mark on a solid square, safe-zone padded) rasterized with `@vite-pwa/assets-generator` (devDependency, script `pwa:icons`, preset `minimal-2023`) into `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`. PNGs are committed so CI and builds don't run the generator. Manifest `theme_color` / `background_color` are literal hex values, defined once as named constants in `web/src/lib/seo/manifest.ts`; DESIGN.md's "no raw hex" rule targets UI styling, and manifests cannot reference CSS variables. Values are fixed by contract R10: `theme_color` `#822DDA` (design-tokens "Grape" light primary) and `background_color` `#FFFFFF`; the same `theme_color` goes into the injected `theme-color` meta.

### D10. Verification: `seo:check` over the build output
`web/scripts/seo-check.ts` (run with `bun`, no new deps; HTML scanned with targeted regexes / `HTMLRewriter` which Bun ships) after `bun run build`, reading `build/`, `BASE_PATH`, `PUBLIC_SITE_URL`:
1. The 9 page documents exist (`index.html`, `en/index.html`, `es/index.html`, `como-usar.html`, `sobre.html`, `en/how-to-use.html`, `en/about.html`, `es/como-usar.html`, `es/acerca-de.html`).
2. Each has exactly one canonical (= own URL; tool URLs end with `/`, content URLs do not) and alternates for every locale + `x-default`, all absolute under `PUBLIC_SITE_URL`, and a manifest link to its locale.
3. `sitemap.xml`: 9 `<loc>`, each with 3 alternates + `x-default`; no `/_` path. `robots.txt` has the `Sitemap:` line.
4. 3 manifests parse, have localized `name` equal to the catalog value, identical `id`/`scope` under `BASE_PATH`, `start_url` per D6, and every icon file exists.
5. `sw.js` exists; its precache list includes the 9 pages, `404.html`, the manifests, and every `*.wasm` found in `build/` (vacuous if none); no `/_` entry.
Exits non-zero with one line per violation. CI already runs it through `web-scaffold`'s `bun run --if-present seo:check` step after the build with `BASE_PATH` set (R1); defining the script is what activates it. When `PUBLIC_SITE_URL` is unset (CI `web.yml`), the script expects the same localhost fallback the build used. Unit tests (`bun run test`) cover D4/D6 pure functions. Playwright specs in `web/e2e/pwa-seo/` (default project, preview under `BASE_PATH=/Rusticker`) assert the served HTML for all 9 URLs, sitemap/robots/manifest reachability, SW registration, the offline reload, and the manifest update after a locale switch. Lighthouse stays an optional manual check; Lighthouse 12 no longer has a PWA category.

### Privacy
The SW only precaches build files (same origin) and has no runtime caching routes; image blobs, `ImageData`, and generated WEBP/zip never pass through `fetch`, so they cannot enter Cache Storage. No analytics, no external requests. Sitemap/robots contain only static URLs.

## Risks / Trade-offs

- [GitHub Pages serves `404.html` with HTTP 404 for paths without a file, and redirects `/en` to `/en/`] → tool shells are prerendered per locale by `web-scaffold`; `seo:check` requires all 9 documents and only trailing-slash tool URLs, so a regression fails CI.
- [robots.txt is only honored at the host root; on a project site (`user.github.io/Rusticker/robots.txt`) crawlers ignore it] → still generated (correct under a custom domain); README documents submitting `sitemap.xml` in Search Console for project sites.
- [Stale head tags after client-side navigation, e.g. a locale switch without reload (D5)] → client updater in `PwaRegistration` rewrites the `data-pwa-seo` elements after every navigation; covered by a client-project unit test.
- [Large `.wasm` beyond the precache size limit is silently skipped] → limit raised to 10 MiB and `seo:check` asserts every built `.wasm` is precached.
- [First visit installs the SW and precaches all locales (~3x page HTML + chunks); extra download on slow links] → pages are small; JS chunks are shared across locales.
- [Paraglide reroute or locale redirect might rewrite `/sitemap.xml`, `/robots.txt`, or `/manifest-*.webmanifest`] → task verifies the built files; if needed, exclude these paths in the SEO handle ordering or Paraglide URL patterns (minimal change, documented in the PR).
- [Parallel edits to `vite.config.ts`, `+layout.svelte`, `package.json`, messages with `design-tokens` / `wasm-worker`] → separated blocks only; on `bun.lock` conflict take develop's and re-run `bun install`.
- [A broken SW can pin users to an old version] → `prompt` mode + Workbox revisioned precache; rollback is deploying a fixed build (the SW byte-diff triggers an update). Kill switch if ever needed: deploy a self-unregistering `sw.js`.

## Migration Plan

Additive. Deploy as usual through `deploy.yml` once `PUBLIC_SITE_URL` is set. Rollback: revert the change; previously installed clients pick up the new `sw.js` (or its absence) on the next update check — if the SW file disappears, the browser unregisters it after a 404 on update.

## Open Questions

- **Contract deviation (ownership):** new directory `web/src/lib/pwa/**` and route `manifest-[locale].webmanifest` are not listed in the contract table; neither is claimed by another change.
- **Tool page title/description in static HTML:** with `ssr = false`, the `meta_*` title/description from `web-scaffold` are client-only. Injecting them in `seoHandle` too would need the page -> `meta_*` key mapping; deferred unless Lighthouse/SEO testing shows it matters.
- **Final icon:** the placeholder icon is to be replaced by real artwork in a later change.
- **Update toast:** deferred by contract R10; `needRefresh` / `applyUpdate()` are ready for whoever picks it up.
- **Custom domain:** if one is adopted, set repository variable `PUBLIC_SITE_URL` and `BASE_PATH` empty; no code change.
