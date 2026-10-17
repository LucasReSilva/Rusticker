## Purpose
Defines how the Rusticker web app is delivered: a fully static site with a fixed set of pages, prerendered content pages, browser-only tool pages, an SPA fallback, and deployment under a configurable base path, with no server-side runtime.

## MODIFIED Requirements

### Requirement: Page set
The web app SHALL provide a localized tool page, how-to-use page, about page, processing-history page, and image-upscaler page. The how-to-use page SHALL explain step by step how to import the generated pack into WhatsApp, and the about page SHALL explain the privacy model. The processing-history page SHALL present only local processing summaries and SHALL NOT provide access to source or output images. The about page SHALL state that all image processing happens on the user's device and that images are never uploaded. The image-upscaler page SHALL provide conventional browser resampling for one static image as specified by the image-upscaling capability. Each page SHALL be available in every supported locale, at the localized URLs defined by the localization capability.

#### Scenario: Upscaler page is localized
- **WHEN** a user opens the image-upscaler page under a supported locale URL
- **THEN** the conventional single-image upscaling tool is available in that locale
- **AND** no image data is sent over the network

#### Scenario: Processing history has a localized URL
- **WHEN** a user opens the history page in any supported locale
- **THEN** the page is available at that locale's localized history URL
- **AND** the shared header keeps links in the active locale

#### Scenario: About page states the privacy model
- **WHEN** a user opens the about page in any supported locale
- **THEN** the page states, in that locale, that images are processed locally in the browser and never uploaded

#### Scenario: How-to-use page explains the import
- **WHEN** a user opens the how-to-use page in any supported locale
- **THEN** the page lists, in that locale, the steps from preparing the image to importing the pack into WhatsApp

#### Scenario: History contains summaries only
- **WHEN** a user opens a processing-history entry
- **THEN** the page displays its localized summary
- **AND** it does not restore or link to source-image pixels or prior pack files

### Requirement: Shared navigation header
Every page SHALL show a header with the official application logo, app name, and links to the tool page, the how-to-use page, the about page, and the image-upscaler page. Each link SHALL point to that page in the active locale.

#### Scenario: Header has upscaler link
- **WHEN** a user opens any public page in any supported locale
- **THEN** the header shows an image-upscaler link
- **AND** the link points to that page in the active locale

#### Scenario: Navigation keeps the locale
- **WHEN** a user on the English about page activates the how-to-use link in the header
- **THEN** the English how-to-use page opens

#### Scenario: Header on every page
- **WHEN** a user opens any of the three pages in any supported locale
- **THEN** the header with the official logo and navigation links is present

## Requirements

### Requirement: Fully static delivery
The web app SHALL build to a directory of static files that any static file host can serve. It SHALL NOT need a server-side runtime, an API, or a database. At runtime, the app SHALL only request its own static assets and SHALL NOT send user data over the network.

#### Scenario: Build output is static
- **WHEN** the production build runs
- **THEN** it produces a directory that contains only static files (HTML, scripts, styles, and other assets)
- **AND** the site works when that directory is served by a plain static file server

#### Scenario: No third-party requests
- **WHEN** a user loads any page of the built site and navigates between pages
- **THEN** every network request goes to the site's own origin and base path

### Requirement: Page set
The web app SHALL provide a localized tool page, how-to-use page, about page, processing-history page, and image-upscaler page. The how-to-use page SHALL explain step by step how to import the generated pack into WhatsApp, and the about page SHALL explain the privacy model. The processing-history page SHALL present only local processing summaries and SHALL NOT provide access to source or output images. The about page SHALL state that all image processing happens on the user's device and that images are never uploaded. The image-upscaler page SHALL provide conventional browser resampling for one static image as specified by the image-upscaling capability. Each page SHALL be available in every supported locale, at the localized URLs defined by the localization capability.

#### Scenario: Processing history has a localized URL
- **WHEN** a user opens the history page in any supported locale
- **THEN** the page is available at that locale's localized history URL
- **AND** the shared header keeps links in the active locale

#### Scenario: About page states the privacy model
- **WHEN** a user opens the about page in any supported locale
- **THEN** the page states, in that locale, that images are processed locally in the browser and never uploaded

#### Scenario: How-to-use page explains the import
- **WHEN** a user opens the how-to-use page in any supported locale
- **THEN** the page lists, in that locale, the steps from preparing the image to importing the pack into WhatsApp

#### Scenario: History contains summaries only
- **WHEN** a user opens a processing-history entry
- **THEN** the page displays its localized summary
- **AND** it does not restore or link to source-image pixels or prior pack files

#### Scenario: Upscaler page is localized
- **WHEN** a user opens the image-upscaler page under a supported locale URL
- **THEN** the conventional single-image upscaling tool is available in that locale
- **AND** no image data is sent over the network

### Requirement: Shared navigation header
Every page SHALL show a header with the official application logo, app name, and links to the tool page, the how-to-use page, the about page, and the image-upscaler page. Each link SHALL point to that page in the active locale.

#### Scenario: Navigation keeps the locale
- **WHEN** a user on the English about page activates the how-to-use link in the header
- **THEN** the English how-to-use page opens

#### Scenario: Header on every page
- **WHEN** a user opens any public page in any supported locale
- **THEN** the header with the official logo and navigation links is present
- **AND** the image-upscaler link points to the active locale's upscaler URL

### Requirement: Prerendered content pages
The how-to-use and about pages SHALL be generated at build time as complete HTML documents, one for each supported locale, so their content is readable without running scripts.

#### Scenario: Content without scripts
- **WHEN** a client with scripts disabled requests the Spanish about page URL from the built site
- **THEN** the response is an HTML document that contains the about page content in Spanish

#### Scenario: Every locale variant is generated
- **WHEN** the production build completes
- **THEN** the output contains one generated HTML document for each combination of content page and supported locale (two pages times three locales)

### Requirement: Browser-only tool page
The tool page and image-upscaler page SHALL render their interactive content only in the browser, because they depend on browser-only capabilities. For each supported locale, the build SHALL emit a document for each browser-only tool URL that boots the app in that locale. A tool URL SHALL work with or without a trailing slash.

#### Scenario: Tool page in a prefixed locale
- **WHEN** a user opens the English tool URL, with or without a trailing slash
- **THEN** the tool page is displayed in English

#### Scenario: Upscaler route in a prefixed locale
- **WHEN** a user opens the Spanish upscaler URL, with or without a trailing slash
- **THEN** the image-upscaler page is displayed in Spanish

#### Scenario: Tool page in the base locale
- **WHEN** a user opens the site root with no saved preference and a browser language that matches no other supported locale
- **THEN** the tool page is displayed in the base locale

### Requirement: SPA fallback for other URLs
Every URL under the site's base path that has no generated document SHALL be served a fallback document. That document SHALL boot the app in the browser. The app SHALL then show the page that matches the URL, in the locale the URL implies, or a localized not-found page when no page matches.

#### Scenario: Unknown URL in a prefixed locale
- **WHEN** a user opens a URL under the Spanish prefix that matches no page
- **THEN** a not-found page is displayed in Spanish
- **AND** it offers a link back to the Spanish tool page

#### Scenario: Unknown URL without a prefix
- **WHEN** a user opens an unprefixed URL that matches no page
- **THEN** a not-found page is displayed in the locale resolved by the localization rules

### Requirement: Configurable base path
The site SHALL be deployable under a sub-path of a domain, such as a project page at `/<repository-name>`. The sub-path SHALL be set at build time. Every internal link, redirect, and asset reference SHALL include it. When no sub-path is set, the site SHALL be served from the domain root.

#### Scenario: Deployed under a sub-path
- **WHEN** the site is built with the sub-path `/Rusticker` and served at `https://example.test/Rusticker/`
- **THEN** every page, asset, navigation link, and locale redirect resolves under `/Rusticker/`

#### Scenario: Local development
- **WHEN** a developer runs the development server without setting a sub-path
- **THEN** the site is served from the root, for example the English about page at `/en/about`

### Requirement: Automated verification and publishing
Every push and pull request that changes the web app or the image-processing core SHALL trigger an automated pipeline. The pipeline SHALL run type checking, linting, the unit tests, the catalog completeness check, the production build, and the build-output verification, and SHALL fail if any of them fails. It SHALL also run any additional design-lint or search-metadata check that the web app defines, and SHALL skip such a check while it is not defined. When the core sources are present in the repository, the pipeline SHALL build the core package before it installs the web app's dependencies. When they are absent, the pipeline SHALL skip that step. Every push to the main branch SHALL build the site with the repository's sub-path and public site URL, and SHALL publish it to the static host.

#### Scenario: Missing translation blocks a pull request
- **WHEN** a pull request adds a message to the base locale catalog but not to the other catalogs
- **THEN** the pipeline fails at the catalog completeness check

#### Scenario: Core sources absent
- **WHEN** the pipeline runs on a revision that has no core crate
- **THEN** the core build step is skipped and the remaining steps still run and can pass

#### Scenario: Optional check not yet defined
- **WHEN** the pipeline runs and the web app defines no design-lint or search-metadata check
- **THEN** those steps succeed without doing anything

#### Scenario: Merge to main publishes the site
- **WHEN** a commit is pushed to the main branch and the build succeeds
- **THEN** the site is published to the static host under the repository's sub-path

### Requirement: Shared release footer
Every public page SHALL show a semantic footer after its main content. The footer SHALL display the current application version, a reminder that image processing remains on the user's device, and links to the localized privacy page, the project repository, and its changelog. All footer text and accessible labels SHALL exist in every supported locale. The footer SHALL remain readable and operable with keyboard navigation, at viewport widths of at least 375 pixels, and on pages whose content is shorter than the viewport.

#### Scenario: Version and links on every page
- **WHEN** a user opens any public page in a supported locale
- **THEN** the footer shows the version of the application build and localized text for the privacy reminder and links
- **AND** the privacy link opens the about page in the current locale

#### Scenario: Footer without scripts
- **WHEN** a user opens a prerendered content page with scripts disabled
- **THEN** the footer, version, reminder, and links are present in the page's HTML

#### Scenario: Narrow and short page
- **WHEN** a user opens a short page at a 375-pixel viewport width
- **THEN** the footer remains below the main content without horizontal overflow or overlap
- **AND** its links remain focusable and visibly focused
