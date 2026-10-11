# DESIGN.md

The design-system and internationalization (i18n) guide for Rusticker.

> **Status:** these rules apply once `web/` exists. The app, the theme, and the
> message catalogs are introduced by the `web-scaffold` and `design-tokens`
> OpenSpec changes (see the roadmap in [README.md](README.md)). Until then,
> this document is the contract those changes must satisfy. Paths below are
> relative to `web/` unless stated otherwise. Component and file names marked
> *provisional* are confirmed by the change that creates them.

---

## Part 1 — Design system

### Base

- **shadcn-svelte** (Svelte 5), built on **Bits UI** (accessible primitives)
  and **Tailwind CSS v4**.
- Setup (done once, in `web-scaffold`):

  ```sh
  bunx sv add tailwindcss
  bunx shadcn-svelte@latest init
  ```

- Add a component: `bunx shadcn-svelte@latest add <component>`.
- Components are copied into `src/lib/components/ui/`. They are **our code**:
  edit them freely, but keep them token-driven and text-free (see i18n).
- Icons: `@lucide/svelte`. Decorative icons get `aria-hidden="true"`;
  icon-only buttons get a translated `aria-label`.

### The Rule

**The UI uses only design-system components and theme tokens.** No raw hex or
`rgb()` colors, no magic `px` values (`w-[37px]`, `style="margin: 13px"`), no
ad-hoc spacing or radii, no arbitrary values that bypass the theme.

If a component is missing, create it in `src/lib/components/ui/<name>/`
following the shadcn-svelte pattern: variants declared with
`tailwind-variants` (`tv()`), props typed, classes merged with the shared
`cn()` helper, and an `index.ts` that re-exports it.

```svelte
<!-- Don't -->
<div class="ml-4 rounded-[6px] bg-[#2f9e44] p-[13px] text-white">…</div>
<button style="left: 8px">x</button>

<!-- Do -->
<Card.Root class="ms-4 rounded-lg bg-primary p-4 text-primary-foreground">…</Card.Root>
<Button variant="ghost" size="icon" class="start-2" aria-label={m.grid_remove_sticker()}>
  <X aria-hidden="true" />
</Button>
```

### Tokens

All tokens are CSS variables defined in the theme (`src/app.css`) and exposed
to Tailwind v4 through `@theme inline`, with a light set on `:root` and a dark
set on `.dark`.

| Group      | Tokens (shadcn-svelte names, extended as needed)                     |
|------------|----------------------------------------------------------------------|
| Colors     | `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring` (each with `-foreground` where relevant) |
| Radius     | `--radius` and its derived `sm` / `md` / `lg` / `xl` steps          |
| Fonts      | `--font-sans`, `--font-mono`                                        |
| Shadows    | `--shadow-*` scale                                                   |
| Checkerboard | two colors and a cell size for the transparency background (e.g. `--checkerboard-a`, `--checkerboard-b`, `--checkerboard-size`), exposed as a utility such as `bg-checkerboard` |

- **Primary color:** Rusticker has its own primary color (not shadcn's
  default neutral) with WCAG AA contrast against `primary-foreground` and
  the page background in both themes. The exact value is defined in
  `design-tokens`.
- The checkerboard token is the only way to show transparency (Grid cards,
  Preview), so it adapts to light and dark themes.

### Theme

- Light/dark via **mode-watcher** (`<ModeWatcher />` in the root layout).
- Follows the system preference by default.
- `ThemeToggle` lets the user switch; the choice is persisted by mode-watcher
  (localStorage) and restored on load without a flash.

### Planned design-system components

| Component                 | Used for                                              |
|---------------------------|-------------------------------------------------------|
| Button                    | All actions; the primary "Download pack (.zip)"       |
| Card                      | DropZone, each sticker in the Grid                    |
| Slider                    | Background-color tolerance                            |
| Tooltip                   | Explaining the eyedropper and icon-only buttons       |
| Badge                     | Sticker size in KB; "tray icon" marker                |
| Dialog                    | Confirm sticker removal; help                         |
| DropdownMenu (or Select)  | Language selection                                    |
| Sonner                    | Error and success toasts                              |
| Progress, Skeleton        | Feedback while processing                             |
| Separator                 | Visual grouping                                       |

### Feature components (*provisional names*)

Live in `src/lib/components/`, compose only `ui/` components, and take all
text from Paraglide.

- **DropZone** — a Card accepting drag-and-drop, click-to-choose, and paste
  (Ctrl+V); has hover and dragging states.
- **Preview** — the original image with detected boxes drawn over it, plus an
  eyedropper to pick the background color, explained by a Tooltip.
- **Controls** — the tolerance Slider; results update live (debounced) and show
  Progress/Skeleton while processing.
- **Grid** — cut-out stickers in Cards on the checkerboard, each with a size
  Badge, a remove button (Dialog confirmation), and a "use as tray icon" option.
- **Export** — the primary "Download pack (.zip)" Button (WEBP stickers, PNGs,
  tray icon); shows a success toast.
- **LanguageSwitcher** — header DropdownMenu to change locale (see Part 2).
- **ThemeToggle** — header button switching light/dark.

### Accessibility baseline

- **Keyboard everywhere**, including the sticker Grid (arrow keys/Tab between
  stickers, actions reachable without a mouse) and the eyedropper (a keyboard
  path to pick the background color).
- **Visible focus** on every interactive element (the `ring` token); never
  remove outlines without a replacement.
- **WCAG AA contrast** in both themes, for text and meaningful UI.
- **Translated `aria-label`s** and `alt` text — from message catalogs, never
  literals.
- **Respect `prefers-reduced-motion`**: use Tailwind's `motion-safe:` /
  `motion-reduce:` variants; no essential information conveyed by animation.

### Layout

- Responsive and **mobile-first**: base classes target small screens, then
  `sm:`, `md:`, `lg:` add complexity.
- Must not break with longer strings (e.g. German later): no fixed widths on
  text containers, allow wrapping, avoid truncating labels that carry meaning.
- **Logical utilities only**, to prepare for RTL:

  | Use                      | Instead of                 |
  |--------------------------|----------------------------|
  | `ms-*`, `me-*`           | `ml-*`, `mr-*`             |
  | `ps-*`, `pe-*`           | `pl-*`, `pr-*`             |
  | `start-*`, `end-*`       | `left-*`, `right-*`        |
  | `text-start`, `text-end` | `text-left`, `text-right`  |

### Living documentation: `/_design`

A dev-only route (`src/routes/_design/`) showing every `ui/` component and
every variant, in both themes side by side. It is not linked anywhere, is
excluded from prerendering, the sitemap, and production builds. Any new or
changed component must appear there.

---

## Part 2 — Internationalization

### Library

**Paraglide JS**, added with `bunx sv add paraglide`. Messages are compiled to
typed functions (`m.dropzone_title()`), and only the messages actually used
are shipped (tree-shaken). A missing message is a type error.

- Configuration: `web/project.inlang/settings.json` (`baseLocale`, `locales`,
  and `pathPattern: "./messages/{locale}.json"`).
- Compiled output: `web/src/lib/paraglide/` (git-ignored), produced by the
  Vite plugin and by `bun run i18n:compile`.
- Locale helpers live in `web/src/lib/i18n/`: the route table (`routes.js`),
  `localizedPath()` for links, the reactive `locale`, and `switchLocale()`.

### Locales

| Locale  | Role             | URL prefix |
|---------|------------------|------------|
| `pt-BR` | base (source)    | none       |
| `en`    | translation      | `/en`      |
| `es`    | translation      | `/es`      |

Adding a locale = create `messages/<locale>.json`, register the locale in
`project.inlang/settings.json`, and add its slugs to `src/lib/i18n/routes.js`.
Nothing else should need to change.

### Messages

- **All UI text** lives in `messages/*.json`. No hardcoded visible string in
  any component — including `ui/` design-system components (pass text in as
  props or snippets). This covers page `<title>`, meta description, image
  `alt`, `aria-label`, and the PWA manifest texts.
- Use **parameters and plurals** for dynamic text, never string concatenation (excerpt of `messages/en.json`):

  ```json
  {
    "grid_detected_count": "{count} stickers detected",
    "export_pack_progress": "Pack {n} of {total}"
  }
  ```

  Plural forms (e.g. "1 sticker" vs "{count} stickers") use Paraglide's
  variant/plural syntax so each locale applies its own rules.
- **Key naming (convention):** `snake_case`, prefixed by area —
  `dropzone_*`, `preview_*`, `controls_*`, `grid_*`, `export_*`, `nav_*`,
  `meta_*`, `error_*`, `toast_*`, `a11y_*`. Examples: `dropzone_title`,
  `error_no_stickers`, `meta_home_description`.

### Routing and detection

- Non-base locales get a URL prefix (`/en/...`, `/es/...`); the base locale is
  unprefixed. Slugs are translated, and the single source of truth is
  `src/lib/i18n/routes.js` (paths are relative to the base path):

  | Page       | pt-BR        | en               | es              |
  |------------|--------------|------------------|-----------------|
  | Tool       | `/`          | `/en/`           | `/es/`          |
  | How to use | `/como-usar` | `/en/how-to-use` | `/es/como-usar` |
  | About      | `/sobre`     | `/en/about`      | `/es/acerca-de` |

  The tool URLs end with a slash (`/en` redirects to `/en/` on GitHub Pages);
  content pages have none. Route directories stay English (`how-to-use/`,
  `about/`); a `reroute` hook maps each localized URL to them.
- **Detection order:** URL → saved preference (`localStorage`) → browser
  language → `pt-BR`.
  - Rendering depends only on the URL: Paraglide's strategy is
    `['url', 'baseLocale']`, and every unprefixed URL means `pt-BR`. This keeps
    prerendering deterministic.
  - The saved preference and browser language apply through an **entry
    redirect**: when a document loads at an unprefixed URL, the client `init`
    hook (`src/hooks.client.ts`) replaces it with the same page in the saved or
    matching browser locale, keeping the query and hash. In-app navigation
    never redirects.
  - The preference is stored only in the browser, under `PARAGLIDE_LOCALE`,
    and only when the user switches language. Visiting a prefixed URL does not
    change it.

```text
request --> URL has /en or /es? --yes--> use it
                 | no
                 v
           saved preference? --yes--> use it
                 | no
                 v
           navigator.languages match? --yes--> use it
                 | no
                 v
               pt-BR
```

### Static site

- Content pages (how-to-use, about) are **prerendered for every locale**.
  `prerender.entries` in `svelte.config.js` comes from `prerenderEntries()` in
  the route table.
- The tool route (`ssr = false`) is prerendered as a script-only shell per
  locale (`index.html`, `en/index.html`, `es/index.html`), each with the right
  `<html lang>`, so `/en/` and `/es/` load the tool in the right language.
- Every other URL gets the `404.html` SPA fallback, which boots the app and
  shows the matching page or a localized not-found page.
- The base path comes from `BASE_PATH` (empty locally, `/Rusticker` on GitHub
  Pages); `bun run verify:build` checks the generated files.

### SEO

- Dynamic `<html lang>` matching the active locale.
- `<link rel="alternate" hreflang="…">` for every locale, plus `x-default`.
- A sitemap listing every locale variant of every public page.

### LanguageSwitcher

Built on the design-system DropdownMenu, placed in the header. Switching
keeps the current page (same route, other locale) and saves the preference.
It calls `switchLocale(locale)` from `src/lib/i18n/switch.ts`, which navigates
in-app without reloading the document. Never call Paraglide's `setLocale`
directly, because it reloads the page.

### Formatting

Numbers, file sizes (KB), and percentages use `Intl.NumberFormat` with the
active locale (e.g. `style: 'percent'`, or `style: 'unit', unit: 'kilobyte'`).
Never format numbers by hand.

### Errors from the Rust core

The wasm core returns **codes only**, never text (`NoStickers`,
`ImageTooLarge`, `InvalidInput`; the frontend adds `WorkerFailed`). The frontend maps each
code to a message (e.g. `NoStickers` → `m.error_no_stickers()`) and shows it
with a Sonner toast. An unmapped code falls back to a generic error message.

### File names

Output files are locale-neutral: `rusticker-pack-1.zip`, `sticker_01.webp`.
They never depend on the active language.

### Missing-key check

`bun run i18n:check` fails if any locale lacks a key present in `pt-BR` (the
base), has a key that `pt-BR` lacks, or has an empty value. It reads the
locale list from `project.inlang/settings.json`, runs in CI
(`.github/workflows/web.yml`), and should be run before committing new
messages.
