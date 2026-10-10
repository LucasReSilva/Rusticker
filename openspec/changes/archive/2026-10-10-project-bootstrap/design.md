## Context

See proposal.md - Why. The repository has no commits yet. It already contains:
- an MIT `LICENSE`;
- a `.pre-commit-config.yaml` with Cargo hooks (`fmt`, `clippy`, `check --workspace`, all limited to `types: [rust]`) and a `conventional-pre-commit` commit-msg hook;
- OpenSpec tooling in `.agents/` and `.claude/`;
- ten documentation files with zero bytes.

The original product brief was written in Portuguese. This change turns it into English project documentation and uses that documentation as the reference for the next changes.

Local toolchain at the time of writing: cargo 1.98.1, the `wasm32-unknown-unknown` target installed, wasm-pack 0.15.0, and bun 1.3.14.

## Goals / Non-Goals

**Goals:**
- Turn the product brief into English documentation that later changes can cite instead of re-deriving.
- Make the conventions machine-visible to agents through `AGENTS.md`, `CLAUDE.md`, and `openspec/config.yaml`.
- Leave the repository in a state where the next change (`core-detection`) only has to add code.

**Non-Goals:**
- No Cargo workspace, no crates, no `web/` app, and no CI workflow (see Decision 3).
- No hosting decision (GitHub Pages, Vercel, or Netlify).
- No final route slugs. The base-locale slug question (`/how-to-use` or `/como-usar`) belongs to the `web-scaffold` change.

## Decisions

### 1. English everywhere, except for end-user text
Code, file names, docs, commits, and specs are in English. End-user text lives only in Paraglide message catalogs. Agents reply to developers in the developer's language.
- *Why:* the ecosystem (crates, shadcn-svelte, Bits UI) is English. With a single language, mixed names such as `GradeCard` never appear. The product is still i18n-first through the message catalogs.
- *Alternatives:* code in pt-BR as in the original brief, rejected because it creates mixed-language identifiers. Docs in pt-BR with code in English, rejected by the user.
- *Consequence:* the names in the brief are translated in the docs. The table below lists the translations. Each later change confirms the final names.

| Brief (pt-BR)                     | Documented as                               |
|-----------------------------------|---------------------------------------------|
| `detectar(rgba, w, h, cor_fundo, tolerancia)` | `detect(rgba, width, height, background, tolerance)` |
| `Figurinha`, `CodigoErro`         | `Sticker`, `ErrorCode`                      |
| `NenhumaFigurinha`, `ImagemGrandeDemais`, `MaisDe30` | `NoStickers`, `ImageTooLarge`, `TooManyStickers` |
| `Controles.svelte`, `Grade.svelte`, `Exportar.svelte` | `Controls.svelte`, `Grid.svelte`, `Export.svelte` |
| `web/static/exemplo.jpg`          | `web/static/example.jpg`                    |

### 2. Document split
Each document has one job, so that agents know where to look:
- `README.md`: the pitch, the privacy promise, quick-start commands (marked "available after `core-detection` / `web-scaffold`" where they do not exist yet), and the roadmap.
- `ARCHITECTURE.md`: the monorepo layout, the data flow diagram (UI → Worker (Comlink, Transferable) → wasm `detect` → buffers → OffscreenCanvas WEBP), the six algorithm steps with their parameters (HSV range, 3×3 opening, 8-connectivity, 0.4% area, 3×3 alpha blur, row ordering, 480 px fit in a 512 px frame), the WhatsApp constraints, and the "no user-facing text in Rust" rule.
- `DESIGN.md`: the design system rules (shadcn-svelte, Tailwind v4 tokens only, no ad-hoc colors, spacing, or radii, `tailwind-variants` for new components, logical utilities `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`), the planned components, the theme (mode-watcher), the accessibility baseline, the `/_design` living documentation route, and the i18n rules (Paraglide, locales `pt-BR` (base), `en`, `es`, parameters and plurals, `Intl.NumberFormat`, locale-neutral file names, the missing-key check).
- `AGENTS.md`: the language policy, Bun-only package management (`bun`/`bunx`, never `npm`/`npx`), Conventional Commits, the OpenSpec workflow, the rule to always rebuild wasm and reinstall after Rust changes, and pointers to the other documents.
- `CONTRIBUTING.md`: the setup (rustup, wasm-pack, bun, prek), the branch and commit conventions, and how to add a locale or a design system component (marked as becoming applicable in later changes).

### 3. No Cargo workspace yet
Verified locally: a virtual manifest with `members = []` makes `cargo check`, `clippy`, and `test` fail with "the workspace has no members", and makes `cargo fmt --all` fail with "Failed to find targets". The root `Cargo.toml`, the `core` crate, and the CI Rust job are therefore introduced together in `core-detection`, so CI is green from its first run.
- *Alternative:* a placeholder `core/` crate with an empty `lib.rs`. Rejected because it adds code to a no-code change and a CI run over an empty crate verifies nothing.
- The existing Cargo pre-commit hooks stay as they are. They only fire on `.rs` files, so they are inert until `core-detection`.

### 4. Pin the toolchain to a minor version
`rust-toolchain.toml` sets `channel = "1.98"`, with `components = ["rustfmt", "clippy"]` and `targets = ["wasm32-unknown-unknown"]`.
- *Why:* the hooks run `clippy -D warnings`, and new stable releases add lints. An unpinned `stable` would make builds start failing without any code change. Pinning the minor version still picks up patch releases.
- *Alternative:* `channel = "stable"`, rejected because of lint drift. An exact `1.98.1` pin, rejected because it adds needless upkeep for patch releases.

### 5. `CLAUDE.md` delegates to `AGENTS.md`
`CLAUDE.md` contains only an import of `AGENTS.md` (`@AGENTS.md`), so Claude Code and agents that read `AGENTS.md` share one source of conventions.

### 6. OpenSpec config
`context` gets a short paragraph covering the product, the stack, the monorepo layout, the language policy, and the privacy constraint. `rules` gets concise, per-artifact constraints, for example:
- specs: never name libraries; Rust behavior is described as codes, not messages;
- tasks: include verification commands that use `bun` and `cargo`;
- design: respect the design system and i18n rules from `DESIGN.md`.

### 7. Hygiene files
- `.gitattributes`: `* text=auto eol=lf`, with explicit `binary` entries for `*.png`, `*.jpg`, `*.webp`, `*.wasm`, and `*.zip`.
- `.editorconfig`: UTF-8, LF, final newline, and trimmed trailing whitespace. Indentation is 4 spaces for `*.rs`, tabs for web files (matching the default formatting of `sv create`), and 2 spaces for `*.{yml,yaml,json,md}`.
- `.gitignore`: `target/`, `core/pkg/`, `node_modules/`, `web/.svelte-kit/`, `web/build/`, `.env*` (keeping `!.env.example`), and OS and editor files. `bun.lock` is explicitly not ignored.

### 8. Community files
- Code of conduct: Contributor Covenant 2.1.
- `AUTHORS.md`: the name Lucas Silva, with no email published.
- `CONTRIBUTORS.md`: a header and an empty list.
- `CHANGELOG.md`: Keep a Changelog with SemVer, an `Unreleased` section, and an entry for this setup.

## Risks / Trade-offs

- [The docs describe planned commands and components that do not exist yet] → Mark them in the README and CONTRIBUTING as available after the change that introduces them, and have each later change update the docs it affects.
- [Translated names in the docs may differ from what later changes choose] → The docs say the names are provisional, and the specs of later changes are authoritative.
- [Contributors may not install prek (or pre-commit), which leaves Conventional Commits unenforced] → Document `prek install -t pre-commit -t commit-msg` (prek, a drop-in replacement for pre-commit that reads the same config) in CONTRIBUTING. A CI commit-lint check can come with the CI in `core-detection`.
- [`git add --renormalize` is needed if files were created with CRLF before `.gitattributes` existed] → Run it before the first commit. It is cheap because there is no history yet.

## Migration Plan

None. This is the first commit. Rollback means deleting the commit.

## Open Questions

- **Private vulnerability reporting channel.** No Git remote exists yet. SECURITY.md will point to GitHub private vulnerability reporting, and the link will be filled in once the repository is published. This does not affect the specs, because the requirement is only that a private channel is described.
- **Hosting target** (GitHub Pages, Vercel, or Netlify): this affects `paths.base` and is decided before or during `web-scaffold`.
