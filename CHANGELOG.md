# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-10-14

### Bug Fixes

#### Core

- Preserve alpha in sticker detection
- Reduce selected-background edge spill

#### Web

- Prevent telegram export button overflow on narrow viewports
- Prevent telegram export button overflow on narrow viewports

### Documentation

#### Agents

- Verify atomic claim lifecycle

#### Core

- Evaluate ONNX split assistance

#### Openspec

- Prepare post-release roadmap
- Extend post-release roadmap
- Prefer Rust WASM for ONNX
- Prioritize technical documentation
- Archive post-release roadmap
- Archive technical documentation audit
- Archive palette specification
- Archive transparent detection change
- Archive reviewed sticker split change
- Archive edge halo change
- Record ONNX assistance evaluation
- Design private processing history
- Archive agent coordination roadmap
- Archive merged editor and batch changes
- Archive Telegram static export change

#### Unscoped

- Audit implementation and update architecture guide

#### Web

- Evaluate safe WebMCP support

### Features

#### Core

- Add reviewed sticker split assistance

#### Ui

- Apply Rust and WhatsApp palette

#### Web

- Process multiple images in a batch
- Add automatic and advanced processing modes
- Add local processing history page
- Notify when image batches finish
- Mount batch notifications in editor
- Add sticker ordering primitives
- Reorder stickers in the editor
- Allow manual sticker crop adjustment
- Connect manual sticker bounds to editor
- Add static Telegram sticker export
- Wire telegram export into tool page
- Add static Telegram sticker export
- Mount Telegram export in editor
- Show batch processing progress

### Miscellaneous Tasks

#### Openspec

- Merge develop into archive merged changes
- Merge develop into archive merged changes

#### Web

- Merge develop into sticker reordering
- Merge develop into telegram export
- Merge develop into Telegram export branch
- Merge develop into animated processing feature
- Merge develop into animated processing feature
- Merge develop into animated processing feature

### Styling

#### Web

- Format local history files

### Testing

#### Core

- Characterize transparent and non-green backgrounds
- Evaluate watershed split candidates
- Tighten watershed evaluation

#### Web

- Cover combined batch export feedback
- Align editor e2e with advanced mode
- Cover history routes in end-to-end checks
- Scope image processing progressbar in editor e2e test

## [0.2.1] - 2026-10-12

### Bug Fixes

#### Ci

- Declare explicit job permissions and document repository settings

### Miscellaneous Tasks

#### Release

- Merge release/0.2.0 back into develop

## [0.2.0] - 2026-10-11

### Bug Fixes

#### Build

- Use isolated Bun installs for local wasm packages

#### I18n

- Update toast accessibility labels after locale switches

#### Integration

- Localize persistent toast accessibility labels

#### Pwa

- Declare dependencies required by isolated installs

#### Web

- Let seo:check infer the site URL from the build
- Declare the PWA client type dependency directly
- Declare the Workbox registration runtime dependency
- Retain prepared packs across locale changes

### Build System

#### Core

- Add cargo workspace and rusticker-core crate

#### Ui

- Initialize shadcn-svelte and add the component kit

#### Web

- Scaffold SvelteKit 2 app with bun
- Add tailwind, paraglide, eslint, prettier and vitest
- Emit a static site with a validated base path
- Add vite-pwa sveltekit plugin and assets generator
- Add rusticker-core, comlink and wasm build scripts

### CI/CD

### Documentation

#### Agents

- Document shell preference and resume roadmap
- Require AI co-author trailers and prefer Git Bash

#### Build

- Verify fresh worktree setup and Git Bash base paths

#### Integration

- Include agent preferences and roadmap review

#### Openspec

- Mark web-scaffold CI task verified
- Fix CI trigger branches in core-detection design
- Mark core-detection CI task verified
- Plan Playwright e2e verification for later changes
- Move web-scaffold locale e2e off test hook in design-tokens
- Use pre-wired Playwright dev project
- Record passing design system CI verification
- Record passing PWA and SEO CI verification
- Record verified editor CI

#### Unscoped

- Plan roadmap changes for parallel worktree implementation
- Document the web app shell, localized routes and scripts
- Document the Playwright e2e suite
- Document the rusticker-core crate
- Document install, offline use and SEO build variables
- Refresh roadmap after resumed feature validation
- Include refreshed implementation roadmap
- Record verified wave B integration coverage
- Record integration review and verification evidence
- Require a functional sticker flow before release
- Track integrated wave B and ongoing functional tooling
- Mark the editor as integrated in the roadmap
- Record the functional editor and export milestone

### Features

#### Core

- Detect stickers on a uniform background

#### I18n

- Route localized URLs with translated slugs
- Redirect entry URLs and switch locale without reload
- Add the catalog completeness check
- Add theme, language and accessibility messages
- Add localized PWA install texts
- Add localized detection error messages

#### Ui

- Add the Rusticker theme tokens and contrast check
- Make the component kit text-free and add lint:design
- Complete themed header and design system showcase

#### Web

- Add localized layout, tool placeholder, content and error pages
- Add site URL and localized URL helpers for SEO
- Add placeholder app icons and per-locale web manifests
- Precache the app with a prompt-mode service worker
- Add canonical, hreflang, sitemap and robots
- Run sticker detection in a module web worker
- Complete browser detection runtime verification
- Build the local sticker editor
- Integrate the interactive sticker editor
- Create downloadable WhatsApp sticker packs
- Integrate WhatsApp pack export with the editor
- Integrate curated sticker pack export
- Record demo in dark mode english and restrict to main

### Miscellaneous Tasks

#### Openspec

- Archive project-bootstrap and add repository-foundation spec
- Archive core-detection and add sticker-detection spec
- Archive completed changes and sync main specs
- Archive branding-sample-and-deploy and sync main specs
- Archive release-automation and sync main specs
- Archive vscode-config and sync repository-foundation spec

### Testing

#### Core

- Cover sticker-detection scenarios and sample image

#### Integration

- Combine design system for wave B review
- Combine PWA with the themed app shell
- Include keyboard focus fix and offline wasm check
- Combine wasm detection with the offline app
- Include verified design task status
- Include verified fresh wasm setup
- Include explicit PWA runtime dependencies
- Exercise the real locale menu in SEO checks
- Avoid counting an earlier worker wasm request

#### Ui

- Synchronize showcase readiness and menu keyboard focus

#### Web

- Verify the static build output
- Add Playwright e2e suite for routing and locale switching
- Add Playwright dev project for dev-only routes
- Add seo:check over the build output
- Add e2e specs for head tags, discovery files and offline use
- Verify fresh detection workers initialize offline
- Check the sample image through the detection engine
- Verify PWA metadata with the integrated language menu
- Finish worker initialization before counting wasm fetches
- Distinguish precached assets from internal routes
- Verify functional readiness and precache route checks

<!-- generated by git-cliff -->
