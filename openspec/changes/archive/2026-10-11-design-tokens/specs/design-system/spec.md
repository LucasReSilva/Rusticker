## Purpose

Defines the shared visual and accessibility contract of the Rusticker web app: how the light and dark themes behave, the contrast, focus, and motion guarantees, how transparency is shown, the common header with theme and language controls, and the checks that keep every screen on theme tokens.

## ADDED Requirements

### Requirement: Theme follows the system by default
When the user has not chosen a theme, the app SHALL render in the theme (light or dark) that matches the operating system or browser color-scheme preference, and SHALL switch live when that preference changes while the page is open.

#### Scenario: First visit with a dark system preference
- **WHEN** a user with no saved theme preference opens any page while the system prefers a dark color scheme
- **THEN** the page renders in the dark theme

#### Scenario: System preference changes while the page is open
- **WHEN** no theme is saved and the system color scheme changes from light to dark
- **THEN** the page switches to the dark theme without a reload

### Requirement: User can choose and persist a theme
The header SHALL offer a theme control with three choices: light, dark, and follow the system. The choice MUST be stored on the device only, MUST be restored on later visits and on every page of the app, and the page MUST NOT briefly render in the other theme before the stored one is applied.

#### Scenario: Choosing dark overrides a light system preference
- **WHEN** the system prefers light and the user chooses dark
- **THEN** the page switches to the dark theme immediately

#### Scenario: Choice survives a reload
- **WHEN** the user has chosen dark and reloads the page or opens another page of the app
- **THEN** the page renders in the dark theme from its first paint, without a visible flash of the light theme

#### Scenario: Returning to the system theme
- **WHEN** the user chooses "follow the system"
- **THEN** the saved override is cleared and the theme again follows the system preference

### Requirement: Brand colors meet AA contrast in both themes
The app SHALL use its own brand primary color (not a neutral gray and not a green that could be confused with a chroma-key background). In both the light and the dark theme, every text color token MUST have a contrast ratio of at least 4.5:1 against each background token it is designed to sit on, and the focus indicator, input borders, and the primary color used as a non-text indicator MUST have at least 3:1 against the page background. An automated check MUST verify these pairs and fail when any falls below its threshold.

#### Scenario: Primary button text in light theme
- **WHEN** the contrast check evaluates the primary foreground on the primary color in the light theme
- **THEN** the ratio is at least 4.5:1

#### Scenario: Muted text in dark theme
- **WHEN** the contrast check evaluates muted text on the page background and on the muted surface in the dark theme
- **THEN** both ratios are at least 4.5:1

#### Scenario: A token change breaks contrast
- **WHEN** a token is edited so that any checked pair falls below its threshold
- **THEN** the automated contrast check fails and names the pair and theme

### Requirement: Visible keyboard focus
Every interactive element provided by the design system SHALL show a clearly visible focus indicator when it receives keyboard focus, in both themes. The indicator MUST NOT be removed without an equally visible replacement.

#### Scenario: Tabbing through the header
- **WHEN** a keyboard user presses Tab repeatedly from the top of any page
- **THEN** focus moves first to a "skip to main content" link and then through every header control in visual order, and each focused element shows a visible focus indicator

#### Scenario: Skip link moves focus to the content
- **WHEN** the keyboard user activates the "skip to main content" link
- **THEN** focus moves to the start of the page's main content

### Requirement: Keyboard-operable menus and dialogs
Menus and dialogs provided by the design system SHALL be fully operable with the keyboard: they open with Enter or Space on their trigger, arrow keys move between menu items, Escape closes them, focus stays inside an open dialog, and on close focus returns to the element that opened it.

#### Scenario: Changing language with the keyboard only
- **WHEN** a keyboard user focuses the language control, presses Enter, moves with the arrow keys to another language, and presses Enter
- **THEN** the language changes exactly as if the option had been clicked

#### Scenario: Escape closes a menu
- **WHEN** the theme menu is open and the user presses Escape
- **THEN** the menu closes and focus returns to the theme control

### Requirement: Reduced motion is respected
When the user's system requests reduced motion, the app SHALL suppress non-essential animations and transitions (menus, dialogs, toasts, loading shimmer, smooth scrolling) so that changes appear without movement, and no information SHALL be conveyed only through animation. Components MUST still open, close, and update correctly.

#### Scenario: Opening a dialog with reduced motion
- **WHEN** reduced motion is requested and the user opens a dialog
- **THEN** the dialog appears without a zoom or slide animation and remains fully usable, and closing it removes it from the page

### Requirement: Transparency is shown on a theme-aware checkerboard
The design system SHALL provide a single checkerboard background used wherever transparent pixels are displayed. Its two cell colors MUST come from theme tokens, MUST differ visibly from each other in both themes, and MUST change with the active theme. A white sticker outline MUST remain distinguishable from the checkerboard's darker cells in the light theme.

#### Scenario: Checkerboard follows the theme
- **WHEN** a transparent image is displayed on the checkerboard and the user switches from light to dark
- **THEN** the checkerboard switches to its dark-theme cell colors while keeping the same cell size

### Requirement: Shared header on every page
Every public page SHALL show the same header containing the app name (linking to the tool page in the active language), navigation to the how-to-use and about pages in the active language, the theme control, and the language control. The header layout MUST remain usable on small screens and with longer translated labels.

#### Scenario: Header links follow the active language
- **WHEN** the active language is English and the user activates the "about" link in the header
- **THEN** the English about page opens at its translated address

### Requirement: Language switch keeps the current page and is remembered
The language control SHALL list every supported language by its own name in that language and SHALL mark the active one. Choosing another language MUST show the same page in the chosen language, at that language's address (including translated page addresses), MUST NOT reload the page (so in-progress work on the page is kept), and MUST save the choice on the device so that later visits without a language in the address use it.

#### Scenario: Switching language keeps the current page and does not reload
- **WHEN** the user is on the how-to-use page in Portuguese and chooses Spanish
- **THEN** the how-to-use page is shown at its Spanish address with Spanish text, without a full page reload

#### Scenario: Switching language on the tool page
- **WHEN** the user is on the tool page in English and chooses Portuguese
- **THEN** the tool page is shown at the base (unprefixed) address in Portuguese without a full page reload, and the interface text, the header, and the document language all change to Portuguese

#### Scenario: Preference is remembered
- **WHEN** the user has chosen English and later opens the site at an address without a language prefix
- **THEN** the saved preference is applied according to the app's language detection order

### Requirement: Design-system text is localized
All visible and assistive text produced by the design system and its header (control labels, menu options, screen-reader-only labels such as the dialog close label, the skip link, the toast region label, and loading labels) SHALL come from the message catalogs and MUST exist in every supported locale. Icon-only controls MUST have an accessible name in the active language, and decorative icons MUST be hidden from assistive technology.

#### Scenario: Dialog close label in Spanish
- **WHEN** the active language is Spanish and a dialog is open
- **THEN** the dialog's close control has an accessible name in Spanish

#### Scenario: Missing translation is caught
- **WHEN** a design-system message exists in the base locale but not in another supported locale
- **THEN** the project's missing-message check fails

### Requirement: Styling stays on tokens and direction-neutral
Application source code SHALL style colors only through theme tokens and SHALL express horizontal spacing and positioning with direction-neutral (start/end) rules, so the layout can mirror for right-to-left languages. An automated check MUST fail when source files outside the theme definition contain raw color literals or left/right-specific spacing or positioning utilities.

#### Scenario: Raw color literal is rejected
- **WHEN** a component in the app's source contains a hard-coded hexadecimal color
- **THEN** the design guardrail check fails and reports the file and line

#### Scenario: Physical margin utility is rejected
- **WHEN** a component uses a left- or right-specific margin, padding, or position utility
- **THEN** the design guardrail check fails and suggests the start/end equivalent

### Requirement: Living documentation only in development
The app SHALL provide a living documentation page that shows every design-system component and each of its variants, rendered side by side in the light and the dark theme, with all its text from the message catalogs. This page MUST be available only in the development environment: in a production build it MUST NOT be linked from any page, MUST NOT be prerendered, MUST NOT appear in the sitemap, MUST respond as "not found", and its showcase content MUST NOT be included in the shipped assets.

#### Scenario: Developer opens the documentation page
- **WHEN** a developer runs the development server and opens the living documentation address
- **THEN** every design-system component and variant is shown in both themes

#### Scenario: Production build
- **WHEN** the production site is built and the living documentation address is requested
- **THEN** the not-found page is shown, the address is absent from the sitemap and from the prerendered pages, and the shipped assets contain none of the showcase content
