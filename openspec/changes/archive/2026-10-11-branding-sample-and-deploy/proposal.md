## Why

Rusticker now has complete end-to-end functionality (detection, curation, WhatsApp export), but lacks the official visual identity (logo in README, site favicon, PWA icons, and header) and bundles no public sample sticker sheet for quick user evaluation and testing. Additionally, the GitHub Pages deployment action must be confirmed and verified to automatically deploy every release merged into `main`.

## What Changes

- **Repository and App Branding (`web/`, docs)**:
  - Add official high-resolution logo (`assets/logo.png`, `web/static/logo.png`).
  - Generate favicons and PWA icons (`favicon.ico`, `favicon.png`, `apple-touch-icon-180x180.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`).
  - Feature the official logo in `README.md` header and application header component (`Header.svelte`).
  - Update Open Graph / social card metadata (`og:image`) to use the official logo.
- **Sample Sticker Sheet (`core/`, `web/`, docs)**:
  - Add the official sample sticker sheet to the repository (`samples/rust-stickers.png` and `web/static/samples/rust-stickers.png`).
  - Enable `"png"` feature in `core/Cargo.toml` dev-dependencies so Rust test runners can decode PNG sample images.
  - Update `core/tests/sample_image.rs` to fall back to the bundled sample image when `RUSTICKER_SAMPLE_IMAGE` is not set.
  - Add a "Try with sample image" / "Testar com exemplo" shortcut in `DropZone.svelte` so users can instantly test the app in the browser without uploading their own file.
- **GitHub Pages Deployment Automation (`.github/workflows/deploy.yml`)**:
  - Remove restrictive path filters from `deploy.yml` so that every push to `main` (releases, documentation updates, asset updates) triggers deployment to GitHub Pages.
  - Validate syntax and workflow steps.

## Capabilities

### Modified Capabilities

- `sticker-detection`: The reference sample image check supports the bundled repository sample image (`samples/rust-stickers.png`) in addition to custom `RUSTICKER_SAMPLE_IMAGE` overrides.
- `web-app-shell`: The web application shell uses the official Rusticker logo for favicon, PWA manifest icons, and application header branding.

## Impact

- Touches both `core/` (dev-dependencies for PNG in sample test) and `web/` (static assets, Header, DropZone, i18n messages).
- Touches root documentation (`README.md`, `assets/`, `samples/`) and GitHub Actions (`.github/workflows/deploy.yml`).

