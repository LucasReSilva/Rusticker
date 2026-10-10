## Why

Rusticker is an empty repository: no commits, placeholder documentation files with zero bytes, and an OpenSpec config with no project context. Every later change (Rust core, SvelteKit app, design system, i18n, WhatsApp export) depends on shared conventions — language, commit style, line endings, toolchain, architecture boundaries — so those must be written down once, before any product code exists, and land as the project's first commit.

## What Changes

- Fill the existing empty documents with real content, in English:
  - `README.md`: what Rusticker is, the privacy promise (everything runs in the browser), the planned stack, the planned developer commands, and a roadmap of upcoming changes.
  - `ARCHITECTURE.md`: monorepo layout (`core/` Rust → WebAssembly, `web/` SvelteKit), the Rust ↔ Worker ↔ UI data flow, the detection algorithm, and the "Rust never returns user-facing text" rule.
  - `DESIGN.md`: design system rules (shadcn-svelte components and theme tokens only, logical Tailwind utilities, accessibility baseline) and i18n rules (Paraglide, no hardcoded strings, locale-neutral file names).
  - `AGENTS.md`: conventions for AI agents and contributors. Code, docs, commits, and specs are always in English, and agents reply to developers in the developer's own language.
  - `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `AUTHORS.md`, `CONTRIBUTORS.md`.
- Add `CLAUDE.md`, which points to `AGENTS.md`, so that Claude Code and other agents share a single source of conventions.
- Fill `openspec/config.yaml` with the project `context` and per-artifact `rules`.
- Add repository hygiene files: `.gitignore`, `.gitattributes` (LF line endings), and `.editorconfig`.
- Add `rust-toolchain.toml` to pin the Rust toolchain, with `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target.
- Commit the existing OpenSpec tooling (`.agents/`, `.claude/`) and `.pre-commit-config.yaml` as they are.
- Create the first commit, `chore: initial project setup`, following Conventional Commits.

Not included: any product code, `Cargo.toml` or a Cargo workspace, the `core/` or `web/` directories, CI workflows, or a deployment target. A virtual Cargo workspace with no members makes every `cargo` command fail, so the workspace and the CI Rust job come in the next change together with the `core` crate.

## Capabilities

### New Capabilities
- `repository-foundation`: the conventions every contribution to the repository must follow. Covers the language policy, commit message format, line endings, the pinned toolchain, ignored build artifacts, required project documentation, and the privacy statement.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- **Files:** only documentation and configuration at the repository root; no source code.
- **Tooling:** contributors need `prek` (or `pre-commit`, same config) installed to enforce Conventional Commits locally. Through `rust-toolchain.toml`, rustup will install the pinned toolchain and the wasm target on first use.
- **Downstream changes:** `core-detection`, `web-scaffold`, and the rest of the roadmap inherit the conventions defined here, and the agents that write those changes read them through `openspec/config.yaml` and `AGENTS.md`.
