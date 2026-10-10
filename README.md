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

Rusticker is in **early development**. The repository currently contains only
the project foundation (documentation, configuration, and toolchain pin). The
`core/` crate and the `web/` app do not exist yet. The commands below become
available as the changes in the [roadmap](#roadmap) land.

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
| `bun install`                        | `web/`  | Installs dependencies, including `core/pkg`      | `web-scaffold`  |
| `bun run dev`                        | `web/`  | Starts the Vite dev server                       | `web-scaffold`  |
| `bun run build`                      | `web/`  | Builds the static site                           | `web-scaffold`  |

Scripts planned in `web/package.json`:

| Script                  | What it does                                                    | Available after |
|-------------------------|-----------------------------------------------------------------|-----------------|
| `bun run build:wasm`    | Compiles the crate with `wasm-pack` and reinstalls the local package | `web-scaffold` |
| `bun run dev:all`       | Builds the wasm, then starts the Vite dev server                | `web-scaffold`  |
| `bun run i18n:check`    | Fails if any locale is missing a key that exists in `pt-BR`     | `web-scaffold`  |

> **Note:** the web app depends on the core through `"rusticker-core": "file:../core/pkg"`,
> which Bun **copies** rather than links. Re-run `bun install` in `web/` after
> every `wasm-pack build`, or use `bun run build:wasm`, which does both.

## Adding a locale

Create `web/messages/<locale>.json` with every key from `pt-BR.json`, register
the locale in the Paraglide configuration, and run `bun run i18n:check`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full steps (applicable after
`web-scaffold`).

## Adding a design-system component

Add an existing shadcn-svelte component with
`bunx shadcn-svelte@latest add <component>`. If none fits, create one in
`web/src/lib/components/ui/` following the same pattern (variants with
`tailwind-variants`, theme tokens only, no hardcoded text). See
[CONTRIBUTING.md](CONTRIBUTING.md) and [DESIGN.md](DESIGN.md).

## Roadmap

Work is organized as [OpenSpec](openspec/) changes, in this order. Changes 2
and 3 are independent of each other.

| #  | Change              | Scope                                                                                         | Status      |
|----|---------------------|-----------------------------------------------------------------------------------------------|-------------|
| 1  | `project-bootstrap` | Docs, config, repository hygiene, toolchain pin                                               | In progress |
| 2  | `core-detection`    | Rust crate with synthetic-image tests, Cargo workspace, CI Rust job                           | Planned     |
| 3  | `web-scaffold`      | SvelteKit app, Tailwind, Paraglide, shadcn-svelte, adapter-static, theme, icons, route slugs, hosting | Planned |
| 4  | `design-tokens`     | Theme tokens, transparency checkerboard, `/_design` living documentation route                | Planned     |
| 5  | `wasm-worker`       | Comlink worker; `web/static/example.jpg` yields 17 stickers                                   | Planned     |
| 6  | `tool-ui`           | DropZone, Preview, Controls, Grid, LanguageSwitcher, ThemeToggle                              | Planned     |
| 7  | `whatsapp-export`   | WEBP up to about 100 KB, packs of 3 to 30 stickers, 96×96 tray icon, `.zip`                   | Planned     |
| 8  | `pwa-seo`           | PWA manifest and offline support, `hreflang`, sitemap, `i18n:check` in CI                     | Planned     |

The app will also have how-to-use and about pages (slugs to be finalized in
`web-scaffold`). Component and type names in the docs are provisional until the
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
