# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Local WhatsApp pack export with size-limited WEBP stickers, lossless PNG copies, a tray icon, balanced pack splitting, localized progress and feedback, and per-pack re-downloads.
- Browser sticker editor with local image loading, keyboard background eyedropper, debounced tolerance, confirmation removal, tray-icon selection, accessible grid navigation, and state preserved across language switches.
- Design system with grape-violet theme tokens, accessible UI components, a shared header with theme and language switchers, and a development-only `/_design` showcase.
- Browser detection runtime with a Comlink WebAssembly worker, transferred pixel buffers, latest-wins cancellation, worker recovery, localized error codes, and a deterministic mock detector.

- Project documentation: `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `AGENTS.md` / `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and community files (`CODE_OF_CONDUCT.md`, `AUTHORS.md`, `CONTRIBUTORS.md`, `CHANGELOG.md`).
- OpenSpec configuration with project context and rules.
- Repository hygiene: `.gitignore`, `.gitattributes` with LF line-ending normalization, and `.editorconfig`.
- Pinned Rust toolchain (`rust-toolchain.toml`): Rust 1.98 with `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target.
- Git hooks via [prek](https://github.com/j178/prek): `cargo fmt`, `cargo clippy`, and `cargo check` checks, plus Conventional Commits validation for commit messages.
- `rusticker-core` crate (`core/`) in a Cargo workspace: detects stickers on a uniform-color background (HSV tolerance, 3x3 noise opening, 8-connected components, transparent interior gaps, reading order, 512x512 framing), exposed to the browser through `wasm-bindgen`; reports only the codes `NoStickers`, `ImageTooLarge`, and `InvalidInput`. Rust CI workflow (format, clippy, tests, `wasm-pack` build).
- Static SvelteKit web app shell with localized routes (pt-BR, en, es), catalog check, CI, and GitHub Pages deployment.
- Installable, offline-capable PWA with localized manifests (pt-BR, en, es), canonical and `hreflang` links on every page, `sitemap.xml`, `robots.txt`, and a `seo:check` build-output check.
