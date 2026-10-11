## Context

See `proposal.md` for motivation. Rusticker is a client-side static web application with a Rust WebAssembly core. The repository requires proper branding assets (logo, icons), a public sample sticker sheet for demonstration and automated testing, and guaranteed automatic GitHub Pages deployment upon every merge to `main`.

## Goals / Non-Goals

**Goals:**
- Provide official branding across `README.md`, web app header (`Header.svelte`), favicons, and PWA manifests.
- Bundle the sample sticker sheet in `samples/` and `web/static/samples/`, and support PNG decoding in Rust `core` test runner.
- Add a 1-click "Try with sample image" button in `DropZone.svelte` using purely local static assets (preserving the zero-network privacy guarantee).
- Remove restrictive path filters in `.github/workflows/deploy.yml` so that every push to `main` deploys to GitHub Pages.

**Non-Goals:**
- Modifying the core detection algorithm or sticker packing algorithm.
- Introducing external network calls (all sample assets are local).

## Decisions

### Decision 1: Asset Placement and Deduplication
- Store the official logo at `assets/logo.png` (high-res for repository presentation) and `web/static/logo.png` (web-served asset for app and Open Graph metadata).
- Store the sample sticker sheet at `samples/rust-stickers.png` (repository reference) and `web/static/samples/rust-stickers.png` (web-accessible static asset).
- *Rationale:* Git deduplicates identical binary content automatically by SHA hash. Placing files in `web/static/` allows SvelteKit `adapter-static` to bundle them without dynamic imports or bundler transforms.

### Decision 2: Core Dev-Dependencies PNG Support
- In `core/Cargo.toml`, add `features = ["jpeg", "png"]` under `[dev-dependencies] image`.
- Update `core/tests/sample_image.rs` to fall back to `../samples/rust-stickers.png` if `RUSTICKER_SAMPLE_IMAGE` is unset.
- *Rationale:* The Rust core library itself accepts raw pixel buffers (`image::RgbaImage`), so production wasm footprint is unchanged. Only test harnesses need image file decoders.

### Decision 3: DropZone Sample Loader UX
- Add a secondary action button in `DropZone.svelte`: "Try with sample image" / "Testar com exemplo".
- When clicked, the browser fetches `${base}/samples/rust-stickers.png` (relative to app origin, no internet required), converts it to a `File`/`Blob`, and passes it directly to the editor's existing `loadImage` method.
- Add localized text to `web/messages/{pt-BR,en,es}.json`.

### Decision 4: GitHub Pages Deployment Action Trigger
- In `.github/workflows/deploy.yml`, remove the `paths:` filter under `on.push.branches: [main]`.
- *Rationale:* In Gitflow, every push or PR merged into `main` is a release or hotfix that must be published. Restrictive path filters risk omitting documentation, sample assets, or configuration updates from triggering deployment.

## Risks / Trade-offs

- *[Risk] Sample image size in static build* → `rust-stickers.png` is ~2.3 MB. Mitigation: It is loaded only on explicit user click, never fetched automatically on app start.
- *[Risk] Relative URLs on GitHub Pages base path* → Mitigation: Always prefix web-served static assets with SvelteKit's `base` path from `$app/paths`.

