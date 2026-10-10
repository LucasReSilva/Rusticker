# Contributing to Rusticker

Thank you for your interest in Rusticker! Contributions of all kinds are
welcome: bug reports, ideas, translations, documentation, and code.

By participating in this project you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

> **Status:** the repository is in its bootstrap phase. Some commands and
> folders described below (`core/`, `web/`, the `package.json` scripts) do not
> exist yet. Each one is marked with the change that introduces it, for
> example *(after `core-detection`)* or *(after `web-scaffold`)*. See the
> roadmap in [README.md](README.md).

## Language policy

- **All repository content is in English**: code identifiers, file names,
  comments, documentation, commit messages, branch names, and OpenSpec
  artifacts.
- **User-facing text lives only in the message catalogs**
  (`web/messages/<locale>.json`, managed by Paraglide). Never hardcode
  user-visible strings in components, including `aria-label`s, `alt` text,
  page titles, and meta descriptions.

The full policy, along with the other project rules, is in
[AGENTS.md](AGENTS.md). It applies to humans as well as AI agents.

## Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| [rustup](https://rustup.rs/) | Rust toolchain manager | See the rustup website |
| [wasm-pack](https://rustwasm.github.io/wasm-pack/) | Builds the Rust core into a WebAssembly package | `cargo install wasm-pack` |
| [Bun](https://bun.sh/) | The **only** JavaScript package manager and runtime for this project | See the Bun website |
| [prek](https://github.com/j178/prek) | Runs the Git hooks | See the prek README |

Notes:

- **Rust toolchain:** you do not need to install a specific Rust version by
  hand. [`rust-toolchain.toml`](rust-toolchain.toml) pins the toolchain to
  `1.98` with `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target.
  rustup installs all of them automatically the first time you run `cargo`
  inside the repository.
- **Bun only:** use `bun install`, `bun run <script>`, and `bunx <bin>`. Never
  use `npm`, `npx`, `pnpm`, or `yarn`, and always commit `bun.lock`.
- **prek vs. pre-commit:** prek is a drop-in replacement for
  [pre-commit](https://pre-commit.com/) and reads the same
  [`.pre-commit-config.yaml`](.pre-commit-config.yaml). If you already use
  pre-commit, it works too.

## Setup

Clone the repository and install the Git hooks:

```sh
git clone <repository-url> rusticker
cd rusticker
prek install -t pre-commit -t commit-msg
```

If you use pre-commit instead of prek:

```sh
pre-commit install -t pre-commit -t commit-msg
```

The hooks do the following:

- **pre-commit** (only when Rust files are staged):
  - `cargo fmt --all` formats the code;
  - `cargo clippy --workspace --all-targets --all-features -- -D warnings`
    fails on any lint warning;
  - `cargo check --workspace` checks that everything compiles.
- **commit-msg:** rejects commit messages that do not follow
  [Conventional Commits](https://www.conventionalcommits.org/) (see
  [Commits](#commits)).

To run the pre-commit hooks on every file manually:

```sh
prek run --all-files
```

## Development workflow

Build the WebAssembly core *(after `core-detection`)*:

```sh
wasm-pack build core --target web
```

Install the web app's dependencies *(after `web-scaffold`)*:

```sh
cd web
bun install
```

Then, from the `web/` directory *(after `web-scaffold`)*:

| Command | What it does |
|---------|--------------|
| `bun run dev` | Starts the Vite dev server |
| `bun run build` | Builds the static site |
| `bun run build:wasm` | Rebuilds the Rust core with wasm-pack and reinstalls the local `rusticker-core` package |
| `bun run dev:all` | Builds the wasm package, then starts the dev server |
| `bun run i18n:check` | Fails if any locale is missing a key that exists in `pt-BR` |

Run the Rust tests from the repository root *(after `core-detection`)*:

```sh
cargo test
```

> **After any change in `core/`**, rebuild the wasm package **and** run
> `bun install` again in `web/`. The `file:../core/pkg` dependency is copied,
> not linked, so the web app will not see your changes otherwise.
> `bun run build:wasm` does both steps.

## Commits

Commit messages must follow
[Conventional Commits](https://www.conventionalcommits.org/). The commit-msg
hook enforces this.

```text
<type>(<optional scope>): <short summary in the imperative mood>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

**Suggested scopes:**

| Scope | Area |
|-------|------|
| `core` | The Rust crate (`core/`) |
| `web` | The SvelteKit app (`web/`) in general |
| `i18n` | Message catalogs, locales, translation tooling |
| `ui` | Design-system components and theme tokens |
| `openspec` | OpenSpec proposals, specs, designs, and tasks |

Examples:

```text
feat(core): detect stickers with 8-connected components
fix(web): keep locale prefix when switching theme
feat(i18n): add German locale
docs: explain how to add a design-system component
chore(openspec): archive core-detection change
```

Mark breaking changes with `!` after the type or scope (for example
`feat(core)!: return stickers as bounding boxes only`) and explain them in a
`BREAKING CHANGE:` footer.

### Branches and pull requests (Gitflow)

The repository follows [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/):

| Branch | Purpose | Created from | Merged into |
|---|---|---|---|
| `main` | Released code only; every push deploys to GitHub Pages | — | — |
| `develop` | Integration branch; all feature work lands here | `main` | — |
| `feature/<name>` | One OpenSpec change or one focused piece of work | `develop` | `develop` (PR) |
| `release/<x.y.z>` | Stabilize a release: version bump, CHANGELOG, fixes only | `develop` | `main` (tagged `vX.Y.Z`) and back into `develop` |
| `hotfix/<x.y.z>` | Urgent fix to a released version | `main` | `main` (tagged) and `develop` |

- Name feature branches after the OpenSpec change they implement, e.g.
  `feature/core-detection`. Other work uses a short English name, e.g.
  `feature/zip-file-names`.
- Never commit directly to `main` or `develop`; open a pull request.
- Parallel work uses one git worktree per feature branch, e.g.
  `git worktree add ../Rusticker-wt/core-detection -b feature/core-detection develop`.
  Git-ignored files (such as the local `image/` samples) are not present in a
  worktree; tests that need the sample image read its path from
  `RUSTICKER_SAMPLE_IMAGE`.
- Keep pull requests **small and focused**: one change, one purpose. Split
  unrelated refactors into their own PRs.
- Describe what changed and why, and link the related OpenSpec change if
  there is one.

## OpenSpec workflow

Rusticker uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for
spec-driven development. Any non-trivial change (new behavior, a changed
contract, or an architectural decision) needs a change folder under
`openspec/changes/` before implementation.

1. **Explore** the idea (`/opsx:explore`).
2. **Propose** a change (`/opsx:propose`). This creates
   `openspec/changes/<name>/` with a proposal, delta specs, a design, and
   tasks.
3. **Apply** it (`/opsx:apply <name>`): implement the tasks, checking each one
   off only after it has been verified.
4. **Archive** it (`/opsx:archive <name>`): its delta specs are merged into
   `openspec/specs/`.

`openspec/specs/` is the **source of truth** for current behavior. Do not
implement behavior that contradicts a spec without changing the spec first.

Small fixes (typos, dependency bumps, obvious bugs that do not change a spec)
can go straight to a pull request.

## Adding a locale

*Applies after `web-scaffold`.* Rusticker ships with `pt-BR` (base), `en`, and
`es`. To add another locale, for example `de`:

1. Create `web/messages/de.json` by copying **all** keys from
   `web/messages/pt-BR.json`, then translate every value. Keep the parameter
   placeholders (such as `{count}`) and the plural forms intact.
2. Register the locale in the Paraglide configuration: add `"de"` to the
   `locales` list in `web/project.inlang/settings.json`.
3. Check that no keys are missing:

   ```sh
   cd web
   bun run i18n:check
   ```

4. Run `bun run dev`, switch to the new locale, and check the layout. Longer
   strings must not break buttons, cards, or the header. Test on a narrow
   (mobile) viewport as well.

See the i18n section of [DESIGN.md](DESIGN.md) for the rules on parameters,
plurals, number formatting, and localized routes.

## Adding a design-system component

*Applies after `web-scaffold` (and `design-tokens` for the `/_design` route).*
The UI is built only from design-system components and theme tokens. If you
need a component that does not exist yet:

1. **Try shadcn-svelte first.** From the `web/` directory:

   ```sh
   bunx shadcn-svelte@latest add <component>
   ```

2. **Otherwise, create it yourself** in
   `web/src/lib/components/ui/<name>/`, following the shadcn-svelte pattern:
   - define variants with `tailwind-variants`;
   - use **theme tokens only**: no raw hex colors, magic pixel values, or
     ad-hoc radii;
   - use Tailwind **logical utilities** (`ms-*`, `me-*`, `ps-*`, `pe-*`,
     `start-*`, `end-*`), never `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, or
     `right-*`;
   - take **all** text (labels, `aria-label`s, tooltips) from Paraglide
     messages, never hardcoded strings;
   - keep it keyboard accessible, with a visible focus ring and AA contrast.
3. **Document it** on the dev-only `/_design` route, showing every variant in
   both the light and the dark theme.

The full design rules are in [DESIGN.md](DESIGN.md).

## Pull request checklist

Before opening a pull request, check that:

- [ ] The change is small and focused, and non-trivial work has an OpenSpec
      change under `openspec/changes/` with its tasks checked off.
- [ ] Commit messages follow Conventional Commits, and the branch name is in
      English.
- [ ] All code, comments, and docs are in English.
- [ ] No user-visible string is hardcoded; new text exists in **every**
      `web/messages/<locale>.json`, and `bun run i18n:check` passes.
- [ ] `cargo fmt --all`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`,
      and `cargo test` pass (if Rust code changed).
- [ ] If `core/` changed, the wasm package was rebuilt (`bun run build:wasm`)
      and the web app still works.
- [ ] `bun run build` succeeds (if web code changed).
- [ ] UI changes use only design-system components, theme tokens, and logical
      utilities, and were checked in both themes, with the keyboard, and on a
      narrow viewport.
- [ ] No new network requests send user data anywhere (see
      [SECURITY.md](SECURITY.md)).
- [ ] Only `bun` / `bunx` were used, and `bun.lock` is committed if
      dependencies changed.
- [ ] Docs affected by the change (README, ARCHITECTURE, DESIGN, this file)
      are updated, and user-visible changes are noted in
      [CHANGELOG.md](CHANGELOG.md) under `Unreleased`.
