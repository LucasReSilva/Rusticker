## MODIFIED Requirements

### Requirement: Public page URL table
The site SHALL expose exactly these public pages, each in every supported locale, at these paths relative to the deployment base path:

| page       | pt-BR (default) | en               | es              |
|------------|-----------------|------------------|-----------------|
| tool       | `/`             | `/en/`           | `/es/`          |
| how to use | `/como-usar`    | `/en/how-to-use` | `/es/como-usar` |
| about      | `/sobre`        | `/en/about`      | `/es/acerca-de` |
| history    | `/historico`    | `/en/history`    | `/es/historial` |

These exact forms (tool pages with a trailing slash, content pages without) are the canonical URLs used in every canonical link, alternate link, and sitemap entry. Each of these URLs MUST be served as a successful page response from the static build (not only as a not-found fallback), with the page content in its locale.

#### Scenario: Every variant exists in the build
- **WHEN** the production build output is inspected
- **THEN** a page document exists for each of the 12 URLs in the table

### Requirement: Sitemap lists every locale variant
The site SHALL serve a sitemap at `<base path>/sitemap.xml` that lists every URL of the public page table exactly once as absolute URLs, and for each entry declares the same language alternates and `x-default` as the page itself. The sitemap MUST be a static file in the build output.

#### Scenario: Sitemap content
- **WHEN** the built `sitemap.xml` is parsed
- **THEN** it contains exactly 12 URL entries, one per page-locale pair, each with 3 language alternates and one `x-default`
