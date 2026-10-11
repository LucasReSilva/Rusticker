## 1. Visual Identity & Branding

- [x] 1.1 Ensure official logo files exist at `assets/logo.png` and `web/static/logo.png`, and generate/update PWA icons and favicons in `web/static/icons/` and `web/static/`. Verify with `bun run pwa:icons` or file existence checks.
- [x] 1.2 Update `web/src/lib/components/Header.svelte` to render the official logo alongside the application title with localized accessible alt text. Verify with `bun run test` and `bun run check`.
- [x] 1.3 Update `README.md` header to feature the official logo. Verify with Markdown link verification.

## 2. Sample Sticker Sheet & Core Integration

- [x] 2.1 Ensure the sample sticker sheet is present at `samples/rust-stickers.png` and `web/static/samples/rust-stickers.png`. Verify with `ls` and file size verification.
- [x] 2.2 In `core/Cargo.toml`, add `features = ["jpeg", "png"]` under `[dev-dependencies] image`, and update `core/tests/sample_image.rs` to check the bundled sample image when `RUSTICKER_SAMPLE_IMAGE` is unset. Verify with `cargo test --test sample_image`.
- [x] 2.3 Add a "Try with sample image" button in `web/src/lib/components/DropZone.svelte` that loads the local bundled sample on click, with localized strings in `web/messages/{pt-BR,en,es}.json`. Verify with `bun run i18n:check` and `bun run test`.

## 3. GitHub Pages Deployment Automation

- [x] 3.1 Update `.github/workflows/deploy.yml` to remove the restrictive `paths:` filter from `on.push.branches: [main]` so that any push to `main` deploys to GitHub Pages. Verify YAML syntax with `bunx yaml-lint .github/workflows/deploy.yml`.

## 4. Full Quality Gate & Validation

- [x] 4.1 Run the full core test suite: `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test`. Verify all pass.
- [x] 4.2 Run the full web pipeline: `bun run check`, `bun run lint`, `bun run test`, `bun run build`, `bun run verify:build`, `bun run seo:check`, and `bun run lint:design`. Verify all pass.
- [x] 4.3 Run OpenSpec validation: `openspec validate --all`. Verify all pass.
