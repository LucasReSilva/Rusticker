## Why

The web design system has reusable Svelte components and theme tokens, but contributors lack an isolated place to inspect component variants and states. A local Storybook catalog will make UI review and maintenance faster without changing the shipped application.

## What Changes

- Add a local Storybook workflow for the SvelteKit web package, including start and static-build scripts.
- Catalog core design-system primitives with representative variants and interactive states.
- Load the application's local design tokens and make both light and dark themes available in the preview toolbar.
- Keep Storybook assets, fonts, and runtime dependencies local; do not add CDN or remote asset requests.
- Keep the Storybook catalog out of the production application build and preserve the existing development showcase page.

## Capabilities

### New Capabilities
- `ui-component-catalog`: local, offline-capable documentation and preview for reusable web UI components.

### Modified Capabilities

## Impact

- Affects `web/` development dependencies, scripts, Storybook configuration, component stories, and the Bun lockfile.
- Does not change `core/`, product routes, localized product copy, or production application output.
