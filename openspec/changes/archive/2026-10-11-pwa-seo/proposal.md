## Why

After `web-scaffold`, Rusticker is a static, localized site, but it cannot be installed, it does not work without a network connection, and search engines have no reliable way to find the three locale variants of each page. The brief requires an installable, fully offline app (the whole point of a client-side tool is that it keeps working with no server) and multilingual SEO (`hreflang` + `x-default`, a sitemap with every variant). This change is Wave B, so it can land now in parallel with `design-tokens` and `wasm-worker` without waiting for the tool UI.

## What Changes

This change touches **`web/` only** (plus anchor-based insertions into two files created by `web-scaffold`). It does not touch `core/`.

- **Installable app:** add `@vite-pwa/sveltekit` in a clearly separated PWA block of `web/vite.config.ts`; generate a service worker scoped to the GitHub Pages base path (`BASE_PATH`) and register it from the root layout.
- **Offline:** precache the app shell (JS/CSS chunks), every prerendered page for every locale, the SPA fallback page, icons, web manifests, and any `.wasm` / worker chunks through globs that tolerate their absence (the wasm arrives with `wasm-worker`, in parallel). Offline navigation to any public URL serves the precached page or the SPA fallback.
- **Update strategy: prompt (deferred activation).** A new version installs in the background and takes over only when every app window is closed, so an update never reloads a page in the middle of sticker editing. A reactive "update available" signal is exposed for a later toast; the toast UI itself is out of scope.
- **Localized manifests:** one web app manifest per locale, generated at build time from the message catalogs (`pwa_name`, `pwa_short_name`, `pwa_description`), sharing the same app identity and scope, each with its locale's start URL, `lang`, and the same icons. Each page links the manifest of its locale.
- **Icons:** placeholder brand icon (SVG source) rasterized to 192/512 px PNG, a 512 px maskable PNG, and a 180 px Apple touch icon in `web/static/icons/`.
- **SEO head tags on every page:** absolute canonical URL, `<link rel="alternate" hreflang>` for `pt-BR`, `en`, `es` (translated slugs from the shared contract; tool URLs with a trailing slash `/`, `/en/`, `/es/`, content pages without) plus `x-default` (the unprefixed `pt-BR` URL). Injected into the HTML at render/prerender time so they are present even in the tool page shells that render without SSR.
- **`sitemap.xml`** (prerendered) listing all 9 URL variants (3 pages x 3 locales) with alternate-language links, and **`robots.txt`** (prerendered) pointing to it. Dev-only routes (`/_design`, `/_detection`) are excluded from the sitemap, the head tags, and the precache.
- **Site origin:** absolute URLs come from the build-time env var `PUBLIC_SITE_URL` (e.g. `https://<user>.github.io/Rusticker`); the deploy workflow (pre-wired by `web-scaffold`) already sets it.
- **Messages:** `pwa_name`, `pwa_short_name`, `pwa_description` in `pt-BR`, `en`, `es`.
- **Checks:** a `seo:check` script that inspects the built output (sitemap has 9 URLs, every prerendered page has 3 `hreflang` + `x-default` + canonical, manifests and icons present, precache list covers pages and excludes dev routes) and runs in CI through the `bun run --if-present seo:check` step that `web-scaffold` already wired after the build; unit tests for URL/alternate building. Lighthouse SEO is a manual, optional check.
- **Docs:** README section on installing and offline use; one CHANGELOG bullet.

Out of scope (even though the brief mentions them nearby):
- The "update available" toast and any other visible PWA UI (deferred; not part of any planned change per the shared contract).
- `<html lang>`, page `<title>` and meta description (already delivered by `web-scaffold` via `meta_*`); the `i18n:check` CI step (already in `web-scaffold`'s `web.yml` per the shared contract, despite DESIGN.md saying "wired in `pwa-seo`").
- Producing the wasm or worker (owned by `wasm-worker`); this change only precaches them when present.
- Final brand artwork (placeholder icon now; manifest colors are fixed by the contract: theme `#822DDA`, background `#FFFFFF`).
- Any edit to `.github/workflows/web.yml` or `deploy.yml` (pre-wired by `web-scaffold`).
- Push notifications, background sync, share target, runtime caching of any third-party resource.
- Open Graph / social cards and structured data.

## Capabilities

### New Capabilities
- `offline-install`: the app can be installed from any locale, works fully offline after the first visit (pages in every locale, tool shell, detection assets), stays within the deployment base path, presents localized install metadata, and updates without interrupting a session.
- `search-discoverability`: every public page declares its canonical URL and all locale alternates plus a default, a sitemap lists every locale variant of every public page, a robots file points to it, and dev-only pages are never exposed.

### Modified Capabilities
<!-- none -->

## Impact

- **Wave:** B (branch `feature/pwa-seo`). **Depends on:** `web-scaffold` merged to `develop`. Runs in parallel with `design-tokens` and `wasm-worker`; must not depend on either. Unblocks nothing directly.
- **Files owned (create/modify):**
  - PWA block in `web/vite.config.ts`; dep `@vite-pwa/sveltekit`, devDep `@vite-pwa/assets-generator`, scripts `seo:check` and `pwa:icons` in `web/package.json` / `web/bun.lock`.
  - `web/static/icons/**` (icon source SVG and generated PNGs).
  - `web/src/lib/seo/**` (site URL, localized URL table helpers, alternates/canonical builder, head-injection handle, manifest builder).
  - `web/src/lib/pwa/**` (service-worker registration component and update signal) — new directory, not claimed by any other change.
  - Generation routes: `web/src/routes/sitemap.xml/+server.ts`, `web/src/routes/robots.txt/+server.ts`, `web/src/routes/manifest-[locale].webmanifest/+server.ts`.
  - `web/scripts/seo-check.ts` and unit tests under `web/src/lib/seo/`.
  - Playwright specs `web/e2e/pwa-seo/**`.
  - Keys `pwa_*` in `web/messages/{pt-BR,en,es}.json`.
  - Root layout: replace only the `<!-- @pwa-seo:registration -->` anchor in `src/routes/+layout.svelte` with `<PwaRegistration />` (plus its import).
- **Anchor-based edits to files created by `web-scaffold`:**
  - `web/src/hooks.server.ts`: insert the SEO handle at the `/* @pwa-seo:handle */` anchor inside `sequence(...)` (plus its import).
  - Delete `web/static/robots.txt` if the scaffold created one (replaced by the generated route).
- **No workflow edits:** `web.yml` already runs `bun run --if-present seo:check` after the build (with `BASE_PATH` set) and `deploy.yml` already sets `PUBLIC_SITE_URL`; this change only verifies they now take effect.
- **Docs:** README (install/offline section), one bullet in CHANGELOG.md under Unreleased.
- **Privacy:** the service worker caches only the app's own same-origin build assets; it never caches, stores, or transmits user images, and adds no network requests other than fetching the app's own files.
