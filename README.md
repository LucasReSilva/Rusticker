# Rusticker

Cut a whole sheet of stickers into a WhatsApp sticker pack, right in your browser.

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

## Privacy

**Your images never leave your device.** All image processing runs in your
browser, in Rust compiled to WebAssembly. Rusticker is a static site: there is
no server to upload to, no account, and no network call with your data.

See [SECURITY.md](SECURITY.md) for the privacy guarantees and for how to report
a vulnerability privately.

## Status

Rusticker is in **early development**. The `core/` crate (`rusticker-core`)
detects stickers and builds to WebAssembly, with native tests. The `web/` app
shell exists: a static SvelteKit site with localized routes in Portuguese
(Brazil), English, and Spanish, a placeholder tool page, and the how-to-use and
about pages. The browser tool itself is not wired yet. Commands marked with a
later change become available as the changes in the [roadmap](#roadmap) land.

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

> **Note:** the web app depends on the core through `"rusticker-core": "file:../core/pkg"`,
> which Bun **copies** rather than links. Re-run `bun install` in `web/` after
> every `wasm-pack build`, or use `bun run build:wasm`, which does both.

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
| 1  | `project-bootstrap` | Docs, config, repository hygiene, toolchain pin                                               | Done        |
| 2  | `core-detection`    | Rust crate with synthetic-image tests, Cargo workspace, CI Rust job                           | Done        |
| 3  | `web-scaffold`      | SvelteKit app, Tailwind, Paraglide, adapter-static, localized routes, `i18n:check`, CI, GitHub Pages deploy | Done        |
| 4  | `design-tokens`     | shadcn-svelte, theme tokens, `@lucide/svelte` icons, checkerboard, ThemeToggle, LanguageSwitcher, `/_design` route | Planned |
| 5  | `wasm-worker`       | Comlink worker, detector API + mock; local sample image yields 17 stickers                    | Planned     |
| 6  | `tool-ui`           | DropZone, Preview, Controls, Grid, editor state                                               | Planned     |
| 7  | `whatsapp-export`   | WEBP up to about 100 KB, packs of 3 to 30 stickers, 96×96 tray icon, `.zip`                   | Planned     |
| 8  | `pwa-seo`           | PWA manifest and offline support, `hreflang`, sitemap, robots                                 | Planned     |

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
