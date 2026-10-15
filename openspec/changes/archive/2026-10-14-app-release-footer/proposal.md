## Why

The shared application shell does not show the deployed version or quick access to privacy and project information. A consistent footer makes those details available on every public page, including the static pages before JavaScript loads.

## What Changes

- Add a localized, accessible footer to the shared web layout with the version from `web/package.json`, a browser-local processing reminder, and links to the localized privacy page, repository, and changelog.
- Keep the footer below page content on short and long pages, with wrapping and visible keyboard focus on narrow screens.
- This change touches `web/` only. It does not change image processing, release automation, or the published version number.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app-shell`: Require a shared, localized footer with the current application version, privacy reminder, and useful links on all public pages.

## Impact

The shared SvelteKit layout, a new footer component, localized message catalogs, shell tests, and the `web-app-shell` behavior contract change. No new runtime dependency or network request is required.
