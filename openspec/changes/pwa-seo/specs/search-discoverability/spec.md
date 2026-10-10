## Purpose

Lets search engines discover and correctly index every locale variant of every public Rusticker page, using translated URLs, canonical links, language alternates, a sitemap, and a robots file, while keeping development-only pages hidden.

## ADDED Requirements

### Requirement: Public page URL table
The site SHALL expose exactly these public pages, each in every supported locale, at these paths relative to the deployment base path:

| page       | pt-BR (default) | en               | es              |
|------------|-----------------|------------------|-----------------|
| tool       | `/`             | `/en/`           | `/es/`          |
| how to use | `/como-usar`    | `/en/how-to-use` | `/es/como-usar` |
| about      | `/sobre`        | `/en/about`      | `/es/acerca-de` |

These exact forms (tool pages with a trailing slash, content pages without) are the canonical URLs used in every canonical link, alternate link, and sitemap entry. Each of these URLs MUST be served as a successful page response from the static build (not only as a not-found fallback), with the page content in its locale.

#### Scenario: Every variant exists in the build
- **WHEN** the production build output is inspected
- **THEN** a page document exists for each of the 9 URLs in the table

### Requirement: Absolute URLs use the configured site origin
All absolute URLs emitted for search engines (canonical links, alternate links, sitemap entries, the sitemap reference in the robots file) SHALL be built from the configured public site URL, which includes the deployment base path, followed by the page path from the URL table. The base path MUST appear exactly once.

#### Scenario: GitHub Pages project site
- **WHEN** the site is built with public site URL `https://example.github.io/Rusticker`
- **THEN** the canonical URL of the English about page is `https://example.github.io/Rusticker/en/about`

#### Scenario: No site URL configured
- **WHEN** the site is built without a public site URL
- **THEN** the build uses a local preview origin and emits a warning stating that absolute URLs are not production-ready

### Requirement: Canonical and language alternates on every public page
Every public page document SHALL contain, in its head and without requiring scripts to run: one canonical link to its own absolute URL; one alternate link per supported locale (`pt-BR`, `en`, `es`) pointing to the same page in that locale, using the translated slugs; and one `x-default` alternate pointing to the `pt-BR` URL. This MUST hold for pages rendered on the client as well as for prerendered content pages.

#### Scenario: Spanish how-to-use page
- **WHEN** the document for `/es/como-usar` is fetched
- **THEN** its head declares canonical `/es/como-usar`, alternates `pt-BR` -> `/como-usar`, `en` -> `/en/how-to-use`, `es` -> `/es/como-usar`, and `x-default` -> `/como-usar`, all absolute

#### Scenario: Client-rendered tool page
- **WHEN** the document for `/en/` is fetched without executing scripts
- **THEN** its head already contains the canonical link and the four alternate links

#### Scenario: Tool URLs keep the trailing slash
- **WHEN** the head links of any public page and the sitemap are inspected
- **THEN** the English and Spanish tool URLs appear only as `<site>/en/` and `<site>/es/`, never without the trailing slash, and content-page URLs never end with a slash

#### Scenario: Alternates are reciprocal
- **WHEN** the alternate sets of the three locale variants of one page are compared
- **THEN** they are identical, so each variant links back to every other variant

#### Scenario: Tags follow client-side navigation
- **WHEN** a user switches from `/sobre` to the English about page without a page reload
- **THEN** the document's canonical link, alternates, and linked install manifest correspond to `/en/about`

#### Scenario: New locale added
- **WHEN** a locale is added to the localization settings with its own URL prefix
- **THEN** every page and the sitemap gain an alternate for it without editing the alternate-building logic

### Requirement: Sitemap lists every locale variant
The site SHALL serve a sitemap at `<base path>/sitemap.xml` that lists every URL of the public page table exactly once as absolute URLs, and for each entry declares the same language alternates and `x-default` as the page itself. The sitemap MUST be a static file in the build output.

#### Scenario: Sitemap content
- **WHEN** the built `sitemap.xml` is parsed
- **THEN** it contains exactly 9 URL entries, one per page-locale pair, each with 3 language alternates and one `x-default`

### Requirement: Robots file points to the sitemap
The site SHALL serve a robots file at `<base path>/robots.txt` that allows crawling of public pages and references the absolute sitemap URL.

#### Scenario: Robots content
- **WHEN** the built `robots.txt` is read
- **THEN** it allows all user agents and contains a `Sitemap:` line with the absolute sitemap URL

### Requirement: Dev-only pages are not discoverable
Development-only routes (any route whose path segment starts with `_`, such as `/_design`) SHALL NOT appear in the sitemap, SHALL NOT be the target of any canonical or alternate link, and MUST NOT be present as pages in the production build.

#### Scenario: Design page hidden
- **WHEN** the production sitemap and the head links of every public page are inspected
- **THEN** none of them reference `/_design` or any other underscore-prefixed path

### Requirement: Discoverability is verified on every build
The project SHALL provide an automated check, run in continuous integration after the production build, that fails when any requirement of this capability or the offline-install manifest/icon presence is violated in the build output.

#### Scenario: Missing alternate fails CI
- **WHEN** a public page document in the build lacks one of its locale alternates
- **THEN** the build-output check exits with a failure naming the page and the missing locale
