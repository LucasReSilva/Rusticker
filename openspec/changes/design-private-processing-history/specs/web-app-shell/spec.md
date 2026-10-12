## MODIFIED Requirements

### Requirement: Page set
The web app SHALL provide a localized tool page, how-to-use page, about page, and processing-history page. The how-to-use page SHALL explain step by step how to import the generated pack into WhatsApp, and the about page SHALL explain the privacy model. The processing-history page SHALL present only local processing summaries and SHALL NOT provide access to source or output images. The about page SHALL state that all image processing happens on the user's device and that images are never uploaded. Each page SHALL be available in every supported locale, at the localized URLs defined by the localization capability.

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
