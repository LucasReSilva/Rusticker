# offline-install Specification

## Purpose
Lets people install Rusticker as an app from any supported locale and keep using it fully offline after the first visit, with localized install metadata and updates that never interrupt work in progress.

## Requirements

### Requirement: App is installable
The site SHALL meet browser installability criteria on every public page: it MUST link a web app manifest with an app name, a short name, a description, a standalone display mode, a start URL, a scope, and icons of at least 192x192 and 512x512 pixels including one maskable icon, and it MUST register a service worker that controls the page and handles navigations.

#### Scenario: Install offered on a content page
- **WHEN** a user opens the production site's how-to-use page in a browser that supports installation
- **THEN** the browser reports the site as installable

#### Scenario: Maskable icon available
- **WHEN** the linked manifest is inspected
- **THEN** it lists icons of 192x192 and 512x512 pixels and at least one icon declared as maskable, and every listed icon file is served

### Requirement: Install metadata is localized
The app name, short name, and description presented at install time SHALL come from the localized message catalogs and MUST exist in every supported locale (`pt-BR`, `en`, `es`). Each page MUST link the manifest of its own locale, and that manifest MUST declare that locale's language and start at that locale's tool page. All locale manifests MUST share the same app identity and scope, so installing from any locale yields the same single app.

#### Scenario: Install from an English page
- **WHEN** a user installs the app from `/en/how-to-use`
- **THEN** the install prompt shows the English app name and description, and the installed app opens at `/en/`

#### Scenario: Install from the base locale
- **WHEN** a user installs the app from `/sobre`
- **THEN** the install metadata is in `pt-BR` and the installed app opens at `/`

#### Scenario: Same app across locales
- **WHEN** the three locale manifests are compared
- **THEN** they declare the same identity and the same scope, and differ only in localized texts, language, and start URL

#### Scenario: Missing translation fails the build checks
- **WHEN** any of the install texts is missing from a supported locale's catalog
- **THEN** the missing-key check fails

### Requirement: App honors the deployment base path
The manifest scope, start URLs, icon URLs, service-worker URL and service-worker scope SHALL all be resolved under the deployment base path, and the service worker MUST NOT control or cache anything outside it.

#### Scenario: Deployed under a sub-path
- **WHEN** the site is built with base path `/Rusticker` and installed
- **THEN** the manifest scope is `/Rusticker/`, every start URL begins with `/Rusticker/`, and the service worker is served from and scoped to `/Rusticker/`

#### Scenario: Deployed at the root
- **WHEN** the site is built with an empty base path
- **THEN** the scope is `/` and start URLs have no extra prefix

### Requirement: App works offline after the first visit
After one successful online visit to any public page, the service worker SHALL have cached the application shell, every public page in every locale, the fallback page used for client-rendered routes, the icons, the manifests, and the detection runtime assets when the build contains them. While offline, navigating to any public URL in any locale MUST render that page in its locale, and the tool MUST be able to start detection without network access.

#### Scenario: Offline navigation across locales
- **WHEN** a user visits `/` online once, goes offline, and then opens `/es/acerca-de`
- **THEN** the Spanish about page renders from the cache

#### Scenario: Tool works offline
- **WHEN** a user who visited the site once opens `/en/` while offline and the build includes the detection runtime
- **THEN** the English tool page loads and the detection runtime assets are served from the cache without any network request

#### Scenario: Build without detection runtime
- **WHEN** the site is built before the detection runtime exists in the build output
- **THEN** the build succeeds and the offline cache covers every other listed asset

### Requirement: Dev-only pages are not cached
Development-only pages (design-system showcase, detection diagnostics, and any route whose path segment starts with `_`) SHALL NOT be part of the offline cache.

#### Scenario: Design page excluded
- **WHEN** the offline cache list of a production build is inspected
- **THEN** it contains no entry for `/_design` or any other underscore-prefixed route

### Requirement: Updates never interrupt a session
When a new version of the site is deployed, the running app SHALL keep using the version it started with until every window of the app is closed; the new version MUST take effect on the next launch after that. The app MUST NOT reload a page on its own because of an update. The app SHALL expose an internal "update available" signal so a later change can offer an explicit reload.

#### Scenario: Update while editing
- **WHEN** a new version is deployed while a user has stickers detected in an open tab
- **THEN** the tab is not reloaded and the user's work is preserved

#### Scenario: Update applied on next launch
- **WHEN** the user closes all app windows and opens the app again after the new version was downloaded
- **THEN** the new version is used

### Requirement: Offline cache holds only the app's own files
The service worker SHALL cache only same-origin files produced by the site build. It MUST NOT cache, persist, or transmit user images, detection results, or exported files, and it MUST NOT add any network request beyond fetching the site's own files.

#### Scenario: User image stays out of caches
- **WHEN** a user processes an image and the browser's cache storage is inspected
- **THEN** no cache entry contains the user's image or any derived sticker
