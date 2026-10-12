<p align="center">
  <img src="assets/banner.png" alt="Rusticker Banner" width="800" />
</p>

# Rusticker

Cut a whole sheet of stickers into a WhatsApp sticker pack, right in your browser.

<p align="center">
  <img src="assets/demo.gif" alt="Rusticker Demo" width="800" />
</p>

## What it does

Give Rusticker one image that contains many stickers on a uniform background,
for example chroma-key green with a white outline around each sticker. Rusticker
then:

1. detects each sticker automatically;
2. removes the background, so it becomes transparent (including gaps inside a
   sticker);
3. exports a WhatsApp-ready pack: 512×512 WEBP stickers, a 96×96 tray icon, and
   a `.zip` you can import.

You can pick the background color with an eyedropper and adjust the tolerance
with a slider. The interface is available in Portuguese (Brazil), English, and
Spanish.

## Using the tool

Drop an image, click the drop area to choose one, click "Try with sample image"
to test with the bundled sample sheet ([`samples/rust-stickers.png`](samples/rust-stickers.png)),
or paste an image with Ctrl+V (Cmd+V on macOS). Detection runs automatically on your device. Pick the background
with the eyedropper, using the pointer or arrow keys and Enter, and adjust the
tolerance slider; detection updates after a short pause. Remove unwanted stickers
with the confirmation dialog, then mark a kept sticker as the pack icon. The grid
supports arrow keys, Home, End and Delete. Switching language keeps your image,
kept stickers and icon choice until you reload the page.

Keep at least three stickers, then download the pack. Each ZIP contains WEBP
stickers, lossless PNG copies and the pack icon. More than 30 stickers are split
into balanced packs, with individual download buttons. Prepared packs survive
language changes and can be downloaded again without re-encoding the images.

## Privacy

**Your images never leave your device.** All image processing runs in your
browser, in Rust compiled to WebAssembly. Rusticker is a static site: there is
no server to upload to, no account, and no network call with your data.

See [SECURITY.md](SECURITY.md) for the privacy guarantees and for how to report
a vulnerability privately.

## Status

Rusticker is released as **v0.2.1**. The `core/` crate (`rusticker-core`)
detects stickers and builds to WebAssembly, with native tests. The `web/` app
has localized routes in Portuguese (Brazil), English and Spanish, and a browser
editor for loading, detecting, adjusting, curating and exporting stickers.
The complete flow is verified with synthetic images, including offline export.
Release automation uses `release-plz` and `git-cliff`; release readiness still
requires the end-to-end image-to-pack flow to work before a new release is made.

## Planned stack

- **Core:** Rust compiled to WebAssembly with `wasm-pack` and `wasm-bindgen`,
  using the `image` and `imageproc` crates (no OpenCV).
- **Frontend:** SvelteKit 2 + Svelte 5 (runes) + TypeScript + Vite, built as a
  fully static site with `adapter-static`.
- **Processing off the main thread:** the wasm module runs in a Web Worker,
  exposed through Comlink, with buffers passed as `Transferable`s.
- **Design system:** shadcn-svelte (Bits UI) and Tailwind CSS v4 theme tokens,
  light and dark themes, `@lucide/svelte` icons.
- **i18n:** Paraglide JS with `pt-BR` (base), `en`, and `es`.
- **Tooling:** Bun as package manager and runtime.
- **Offline:** installable PWA via `@vite-pwa/sveltekit`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow and the detection
algorithm, and [DESIGN.md](DESIGN.md) for the design system and i18n rules.

## Post-release roadmap

The v0.2.1 implementation is documented in archived OpenSpec changes.
Follow-up work is being planned in
the existing GitHub Project as six epics and 22 child issues. In addition to
sticker separation, WhatsApp metadata, editing, Telegram files, and agent
coordination, the roadmap covers batch input, processing modes, theme colors,
local history, notifications, WebMCP, and optional ONNX split assistance. The
board's `Complexity` field orders relative effort from `S` through `XL`; these
items are planning candidates, not a release commitment.

Telegram scope is limited to local static PNG/WEBP files; users continue in
Telegram's editor or `@Stickers`. WhatsApp title/author work is gated on
verifying a named importer's actual format support. ONNX and WebMCP work start
with feasibility checks; ONNX would remain an opt-in local second step after
the existing detector. User images remain on the device. See [the roadmap proposal](openspec/changes/post-release-agent-coordination/proposal.md)
for issue-level acceptance criteria.

## Repository layout (planned)

```text
core/       Rust crate `rusticker-core`, compiled to WebAssembly (core-detection)
web/        SvelteKit app; depends on core/pkg as a local package (web-scaffold)
openspec/   OpenSpec specs and change proposals
```

## Prerequisites

- [rustup](https://rustup.rs/). The toolchain, `rustfmt`, `clippy`, and the
  `wasm32-unknown-unknown` target are pinned in
  [rust-toolchain.toml](rust-toolchain.toml) and installed automatically.
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [Bun](https://bun.sh/). Use `bun` and `bunx` only, never `npm` or `npx`.
- [prek](https://github.com/j178/prek) for Git hooks:
  `prek install -t pre-commit -t commit-msg`

## Quick start

In a fresh clone or worktree, build the wasm package before installing or
running the web app:

```sh
cd web
bun run build:wasm
bun run dev
```

`build:wasm` runs wasm-pack before `bun install`, because the local dependency
requires `core/pkg` to exist. For day-to-day development, use `bun run dev:all`
to rebuild the wasm, refresh the copied package, and start Vite together.

| Command                              | Where   | What it does                                     | Available after |
|--------------------------------------|---------|--------------------------------------------------|-----------------|
| `wasm-pack build core --target web`  | root    | Compiles the Rust core to `core/pkg/`            | `core-detection` |
| `cargo test`                         | root    | Runs the Rust unit and synthetic-image tests     | `core-detection` |
| `RUSTICKER_SAMPLE_IMAGE=<abs path> cargo test --release -p rusticker-core --test sample_image -- --nocapture` | root | Local-only check on the private sample image (17 stickers); skipped when the variable is unset | `core-detection` |
| `bun install`                        | `web/`  | Installs dependencies (and `core/pkg` once `wasm-worker` adds it) | `web-scaffold`  |
| `bun run dev`                        | `web/`  | Starts the Vite dev server                       | `web-scaffold`  |
| `bun run build`                      | `web/`  | Builds the static site into `web/build/`         | `web-scaffold`  |

Scripts in `web/package.json`:

| Script                  | What it does                                                    | Available after |
|-------------------------|-----------------------------------------------------------------|-----------------|
| `bun run check`         | Compiles the messages and type-checks the app (`svelte-check`)  | `web-scaffold`  |
| `bun run lint`          | Checks formatting (Prettier) and lints (ESLint)                 | `web-scaffold`  |
| `bun run format`        | Formats every file with Prettier                                | `web-scaffold`  |
| `bun run test`          | Runs the unit tests (Vitest `server` and `client` projects)     | `web-scaffold`  |
| `bun run test:e2e`      | Runs the Playwright end-to-end tests against a GitHub Pages-like build | `web-scaffold` |
| `bun run i18n:compile`  | Compiles the Paraglide catalogs into `src/lib/paraglide/`       | `web-scaffold`  |
| `bun run i18n:check`    | Fails if a locale is missing a key that exists in `pt-BR`, has an extra key, or has an empty value | `web-scaffold` |
| `bun run verify:build`  | Checks the built site: the 9 localized pages, `404.html`, `lang`, and `BASE_PATH` links | `web-scaffold` |
| `bun run build:wasm`    | Compiles the crate with `wasm-pack` and reinstalls the local package | `wasm-worker` |
| `bun run dev:all`       | Builds the wasm, then starts the Vite dev server                | `wasm-worker`   |
| `bun run seo:check`     | Checks the built site for SEO and offline install: canonical and `hreflang` links on the 9 pages, `sitemap.xml`, `robots.txt`, the 3 manifests and icons, and the service-worker precache list | `pwa-seo` |
| `bun run pwa:icons`     | Regenerates the app icons in `static/icons/` from `static/icons/icon.svg` | `pwa-seo` |
| `bun run changelog:preview` | Previews the next changelog section using `git-cliff` across the workspace | `release-automation` |
| `bun run version:sync`  | Synchronizes `web/package.json` version from `core/Cargo.toml` | `release-automation` |
| `bun run version:check` | Verifies that `web/package.json` and `core/Cargo.toml` have matching versions | `release-automation` |
| `bun run demo:record`   | Records automated demo of the app with Playwright and generates `assets/demo.gif` | `developer-tooling` |

> **Note:** the web app depends on the core through `"rusticker-core": "file:../core/pkg"`,
> which Bun **copies** rather than links. Re-run `bun install` in `web/` after
> every `wasm-pack build`, or use `bun run build:wasm`, which does both.

## Install and offline use

Rusticker is an installable web app (PWA). Open it in a supporting browser and
use the browser's install option, from any language: the app is the same, and
it shows its name and opens its start page in the language you installed it
from. After the first visit, every page in every language, the tool, and the
detection runtime are cached, so the app works fully offline. A new version
downloads in the background and is used only after every window of the app has
been closed, so an update never reloads a page while you are editing stickers.
The cache holds only the app's own files, never your images.

Build variables (set by the deploy workflow):

| Variable          | Example                                   | Used for |
|-------------------|-------------------------------------------|----------|
| `BASE_PATH`       | `/Rusticker`                              | Sub-path the site is served from; also the service-worker and manifest scope |
| `PUBLIC_SITE_URL` | `https://lucasresilva.github.io/Rusticker` | Absolute URLs in canonical and `hreflang` links, `sitemap.xml`, and `robots.txt` (includes the base path). When unset, the build warns and uses `http://localhost:4173${BASE_PATH}` |

Run `bun run seo:check` after a build, with the same variables, to verify the
output. On a GitHub Pages project site, crawlers ignore `robots.txt` because it
is not at the host root, so submit `<PUBLIC_SITE_URL>/sitemap.xml` in Google
Search Console instead; with a custom domain, set the repository variable
`PUBLIC_SITE_URL` and an empty `BASE_PATH`.

## Adding a locale

Create `web/messages/<locale>.json` with every key from `pt-BR.json`, register
the locale in `web/project.inlang/settings.json`, add its URL slugs to
`web/src/lib/i18n/routes.js`, and run `bun run i18n:check`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full steps.

## Adding a design-system component

Add an existing shadcn-svelte component with
`bunx shadcn-svelte@latest add <component>`. If none fits, create one in
`web/src/lib/components/ui/` following the same pattern (variants with
`tailwind-variants`, theme tokens only, no hardcoded text). See
[CONTRIBUTING.md](CONTRIBUTING.md) and [DESIGN.md](DESIGN.md).

## Roadmap

Work is organized as [OpenSpec](openspec/) changes, implemented in parallel
waves (each change on its own `feature/<change>` branch and git worktree, merged into `develop`): **A** = 2 and 3; **B** = 4, 5
and 8; **C** = 6 and 7. See each change's proposal under
[openspec/changes/](openspec/changes/) for its dependencies and file ownership.

| #  | Change              | Scope                                                                                         | Status      |
|----|---------------------|-----------------------------------------------------------------------------------------------|-------------|
| 1  | `project-bootstrap` | Docs, config, repository hygiene, toolchain pin                                               | Archived    |
| 2  | `core-detection`    | Rust crate with synthetic-image tests, Cargo workspace, CI Rust job                           | Archived    |
| 3  | `web-scaffold`      | SvelteKit app, Tailwind, Paraglide, adapter-static, localized routes, `i18n:check`, CI, GitHub Pages deploy | Archived    |
| 4  | `design-tokens`     | shadcn-svelte, theme tokens, `@lucide/svelte` icons, checkerboard, ThemeToggle, LanguageSwitcher, `/_design` route | Archived    |
| 5  | `wasm-worker`       | Comlink worker, detector API + mock; local sample image yields 17 stickers                    | Archived    |
| 6  | `tool-ui`           | DropZone, Preview, Controls, Grid, editor state                                               | Archived    |
| 7  | `whatsapp-export`   | WEBP up to about 100 KB, packs of 3 to 30 stickers, 96×96 tray icon, `.zip`                   | Archived    |
| 8  | `pwa-seo`           | PWA manifest and offline support, `hreflang`, sitemap, robots                                 | Archived    |
| 9  | `branding-sample-and-deploy` | Branding logo, sample sticker sheet, and automated deploy workflow                  | Archived    |
| 10 | `release-automation`| Automated semantic versioning and changelogs with `git-cliff` and `release-plz`       | Archived    |

All roadmap changes (1 through 10) are fully implemented, verified, and archived under `openspec/changes/archive/`. Their specifications are active as authoritative contracts under `openspec/specs/`. Releases and changelogs are automated using `git-cliff` and `release-plz`. The end-to-end user flow (load image, detect stickers, curate, export WhatsApp sticker pack) is functionally verified and ready for release.

The Windows local-package install failure is resolved by the isolated Bun
linker configured in `web/bunfig.toml` on the worker branch. A fresh worktree
successfully builds and installs wasm without a manual copy; the generated
and installed wasm hashes match. The private sample yields 17 stickers.
Combined validation passes the unit tests and production build, including
one wasm asset in the offline precache. Browser checks cover all localized
pages, accessible controls, worker detection, and a fresh worker initialized
offline. The combined implementation and CI evidence are available in
[integration PR #9](https://github.com/LucasReSilva/Rusticker/pull/9).

The site is hosted on GitHub Pages at
<https://lucasresilva.github.io/Rusticker/>. The deploy workflow builds it with
`BASE_PATH=/Rusticker` (the repository name); locally `BASE_PATH` is empty and
the site is served from the root. Routes use translated slugs, relative to the
base path (`/en` and `/es` redirect to `/en/` and `/es/`):

| Page       | pt-BR (base, no prefix) | en               | es              |
|------------|-------------------------|------------------|-----------------|
| Tool       | `/`                     | `/en/`           | `/es/`          |
| How to use | `/como-usar`            | `/en/how-to-use` | `/es/como-usar` |
| About      | `/sobre`                | `/en/about`      | `/es/acerca-de` |

 Component and type names in the docs are provisional until the
change that introduces them.

**Later (not planned yet):**

- Separating stickers that touch each other (distance transform + watershed).
- Non-uniform backgrounds, using a segmentation model running in wasm.
- Right-to-left locales (for example Arabic and Hebrew).

## Documentation

| Document                               | Contents                                                   |
|----------------------------------------|------------------------------------------------------------|
| [ARCHITECTURE.md](ARCHITECTURE.md)     | Monorepo layout, data flow, detection algorithm, Rust ↔ JS |
| [DESIGN.md](DESIGN.md)                 | Design system, tokens, accessibility, i18n                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)     | Setup, hooks, commits, adding a locale or a component      |
| [SECURITY.md](SECURITY.md)             | Privacy guarantees and private vulnerability reporting     |
| [AGENTS.md](AGENTS.md)                 | Conventions for AI coding agents (and humans)              |
| [CHANGELOG.md](CHANGELOG.md)           | Notable changes                                            |

## License

[MIT](LICENSE) © Lucas Silva
