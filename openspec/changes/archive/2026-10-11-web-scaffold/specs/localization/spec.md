## Purpose

Defines how Rusticker presents itself in several languages: the supported locales, localized URLs with translated slugs, how the active locale is chosen and remembered, the document language, and the guarantee that every locale has complete user-visible text.

## ADDED Requirements

### Requirement: Supported locales
The app SHALL support the locales `pt-BR`, `en`, and `es`, with `pt-BR` as the base locale. Adding a locale SHALL require only a new message catalog for it and its registration in the localization configuration. URL slugs for the new locale MAY be added as well.

#### Scenario: Locale list
- **WHEN** the app's locale configuration is inspected
- **THEN** it lists exactly `pt-BR`, `en`, and `es`, with `pt-BR` as the base locale

### Requirement: Localized URLs with translated slugs
Pages in the base locale SHALL be served without a locale prefix. Pages in every other locale SHALL be served under a prefix equal to the locale code. Page slugs SHALL be translated per locale, as follows (paths are relative to the site's base path):

| page       | pt-BR        | en               | es              |
|------------|--------------|------------------|-----------------|
| tool       | `/`          | `/en`            | `/es`           |
| how to use | `/como-usar` | `/en/how-to-use` | `/es/como-usar` |
| about      | `/sobre`     | `/en/about`      | `/es/acerca-de` |

Every link the app generates SHALL use the localized URL of its target page in the active locale.

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

### Requirement: Locale resolution order
The app SHALL resolve the active locale in this order: (1) the locale prefix in the URL; (2) the user's saved locale preference; (3) the first entry of the browser's preferred languages that matches a supported locale; (4) `pt-BR`. A URL with a locale prefix SHALL always decide the locale. An unprefixed URL is ambiguous, because it can mean either the base locale or no explicit choice. When a document is loaded at an unprefixed URL and steps 2 or 3 resolve to a locale other than `pt-BR`, the app SHALL replace the current history entry with the equivalent page in that locale, keeping the query string and the fragment. Navigation inside an already-loaded app SHALL NOT trigger this redirect.

A browser language SHALL match a supported locale either when the tags are equal or when its primary language subtag equals the locale's primary subtag. Matching SHALL ignore case. For example, `en-US` matches `en`, `es-419` matches `es`, and `pt-PT` matches `pt-BR`.

#### Scenario: Prefix wins over preference
- **WHEN** a user whose saved preference is `es` opens `/en/about`
- **THEN** the about page is displayed in English and no redirect happens

#### Scenario: Saved preference applied to an unprefixed URL
- **WHEN** a user whose saved preference is `es` opens `/sobre`
- **THEN** the browser ends at `/es/acerca-de` and the page is displayed in Spanish

#### Scenario: Browser language applied when nothing is saved
- **WHEN** a user with no saved preference and browser languages `en-US, fr` opens `/`
- **THEN** the browser ends at `/en` and the tool page is displayed in English

#### Scenario: Saved base-locale preference
- **WHEN** a user whose saved preference is `pt-BR` and whose browser language is `en-US` opens `/`
- **THEN** the tool page is displayed in Brazilian Portuguese and no redirect happens

#### Scenario: Fallback to the base locale
- **WHEN** a user with no saved preference and browser languages `fr-FR, de` opens `/como-usar`
- **THEN** the how-to-use page is displayed in Brazilian Portuguese and no redirect happens

#### Scenario: Regional variant matches
- **WHEN** a user with no saved preference and browser language `pt-PT` opens `/`
- **THEN** the tool page is displayed in Brazilian Portuguese

### Requirement: Saved locale preference
The app SHALL be able to save the locale the user explicitly chooses. The saved preference SHALL be stored only on the user's device, SHALL never be transmitted, and SHALL persist across page loads and browser restarts. Visiting a prefixed URL SHALL NOT, by itself, change the saved preference. If storage is unavailable, locale resolution SHALL skip the saved-preference step without failing.

#### Scenario: Switching language keeps the current page and does not reload
- **WHEN** a user on `/sobre` explicitly switches the language to `en`
- **THEN** the URL becomes `/en/about` through in-app navigation, without reloading the document
- **AND** all visible text on the page and in the header is shown in English
- **AND** the document language becomes `en`
- **AND** `en` is saved as the user's preference

#### Scenario: Switching language keeps the query and fragment
- **WHEN** a user on `/como-usar?x=1#step-3` switches the language to `es`
- **THEN** the URL becomes `/es/como-usar?x=1#step-3` without a reload

#### Scenario: Preference survives a reload
- **WHEN** the user's choice of `en` has been saved and the user later opens `/` in a new tab
- **THEN** the browser ends at `/en`

#### Scenario: Visiting a prefixed link does not overwrite the preference
- **WHEN** a user whose saved preference is `es` follows a link to `/en/about` and later opens `/`
- **THEN** the browser ends at `/es`

#### Scenario: Storage blocked
- **WHEN** the browser denies access to local storage and the browser language is `es-ES`
- **THEN** the user opening `/` ends at `/es` without an error

### Requirement: Document language
The root element of every page SHALL declare the active locale as its document language, both in documents generated at build time and after any navigation or locale redirect in the browser.

#### Scenario: Prerendered document language
- **WHEN** the generated document for `/es/acerca-de` is fetched without running scripts
- **THEN** its root element declares the language `es`

#### Scenario: Language updated in the browser
- **WHEN** a user is redirected in the browser from `/` to `/en`
- **THEN** the root element declares the language `en`

### Requirement: All user-visible text comes from complete catalogs
All user-visible text SHALL come from the per-locale message catalogs. Source code SHALL NOT contain user-visible literals. This includes page titles, meta descriptions, link and navigation labels, accessible names, alternative texts, and the not-found page. Every message SHALL exist, with a non-empty translation, in every supported locale. Messages with dynamic values SHALL use parameters instead of string concatenation. The app name "Rusticker" is a brand and MAY be identical in every locale, but it SHALL still come from the catalogs.

#### Scenario: Switching locale changes every visible text
- **WHEN** a user compares the same page under `/`, `/en`, and `/es` URLs
- **THEN** the header labels, page content, document title, and meta description each appear in the language of that URL

#### Scenario: Localized page metadata
- **WHEN** any page is loaded in any supported locale
- **THEN** the document has a title and a meta description specific to that page, in that locale

### Requirement: Catalog completeness check
The project SHALL provide an automated check that compares every locale catalog with the base locale catalog. The check SHALL fail when a locale is missing a key that exists in the base catalog, has a key that the base catalog lacks, or has an empty value. On failure, it SHALL report each offending locale and key, and SHALL exit with a non-zero status. On success, it SHALL exit with status zero. The check SHALL read the locale list from the localization configuration, so a newly registered locale is checked without changes to the check itself.

#### Scenario: Missing key
- **WHEN** the base catalog contains `nav_about` and the `es` catalog does not
- **THEN** the check exits with a non-zero status and reports `es` missing `nav_about`

#### Scenario: Extra key
- **WHEN** the `en` catalog contains a key that the base catalog lacks
- **THEN** the check exits with a non-zero status and reports the extra key for `en`

#### Scenario: Empty translation
- **WHEN** the `en` catalog has an empty string for a key
- **THEN** the check exits with a non-zero status and reports that key for `en`

#### Scenario: Complete catalogs
- **WHEN** every catalog has exactly the base catalog's keys, all with non-empty values
- **THEN** the check exits with status zero

#### Scenario: Newly registered locale
- **WHEN** a locale `de` is registered in the configuration but its catalog file does not exist
- **THEN** the check exits with a non-zero status and reports the missing catalog for `de`
