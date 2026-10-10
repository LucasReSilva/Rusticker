# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project documentation: `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `AGENTS.md` / `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and community files (`CODE_OF_CONDUCT.md`, `AUTHORS.md`, `CONTRIBUTORS.md`, `CHANGELOG.md`).
- OpenSpec configuration with project context and rules.
- Repository hygiene: `.gitignore`, `.gitattributes` with LF line-ending normalization, and `.editorconfig`.
- Pinned Rust toolchain (`rust-toolchain.toml`): Rust 1.98 with `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target.
- Git hooks via [prek](https://github.com/j178/prek): `cargo fmt`, `cargo clippy`, and `cargo check` checks, plus Conventional Commits validation for commit messages.
