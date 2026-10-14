## MODIFIED Requirements

### Requirement: Localized URLs with translated slugs
Pages in the base locale SHALL be served without a locale prefix. Pages in every other locale SHALL be served under a prefix equal to the locale code. Page slugs SHALL be translated per locale, as follows (paths are relative to the site's base path):

| page       | pt-BR        | en               | es              |
|------------|--------------|------------------|-----------------|
| tool       | `/`          | `/en`            | `/es`           |
| how to use | `/como-usar` | `/en/how-to-use` | `/es/como-usar` |
| about      | `/sobre`     | `/en/about`      | `/es/acerca-de` |
| history    | `/historico` | `/en/history`    | `/es/historial` |

Every link the app generates SHALL use the localized URL of its target page in the active locale.

#### Scenario: Localized processing history
- **WHEN** a user opens the history page
- **THEN** the localized history route is displayed in the locale selected by its URL

#### Scenario: English about page
- **WHEN** a user opens `/en/about`
- **THEN** the about page is displayed in English

#### Scenario: Spanish about page
- **WHEN** a user opens `/es/acerca-de`
- **THEN** the about page is displayed in Spanish

#### Scenario: Base locale how-to-use page
- **WHEN** a user with a saved `pt-BR` preference opens `/como-usar`
- **THEN** the how-to-use page is displayed in Brazilian Portuguese

#### Scenario: Untranslated slug under a prefix
- **WHEN** a user opens `/en/sobre`, which uses the Portuguese slug under the English prefix
- **THEN** a not-found page is displayed in English
