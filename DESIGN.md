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
- Setup: Tailwind is installed in `web-scaffold`; shadcn-svelte initialization is completed in `design-tokens` (CLI 1.7.0):

  ```sh
  bunx sv add tailwindcss
  bunx shadcn-svelte@latest init
  ```

- Add a component: `bunx shadcn-svelte@latest add <component>`.
- Components are copied into `src/lib/components/ui/`. They are **our code**:
  edit them freely, but keep them token-driven and text-free (see i18n).
- Assistive defaults are localized: Dialog `closeLabel` uses `m.a11y_close()`; Sonner container and close labels use `m.a11y_notifications()` and `m.a11y_close()`. Callers may override them.
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

Tokens in `src/app.css` are mapped through Tailwind v4 `@theme inline`.
The light palette applies to `:root, .light`; `.dark` defines the dark palette.
OKLCH values are the source of truth; approximate sRGB hex values below are reference only.
| Token | Light (`:root`, `.light`) | ≈ hex | Dark (`.dark`) | ≈ hex |
|---|---|---|---|---|
| `background` | `oklch(0.99 0.005 85)` | `#fdfcf8` | `oklch(0.17 0.02 145)` | `#0a120a` |
| `foreground` | `oklch(0.2 0.02 70)` | `#1c140c` | `oklch(0.97 0.008 110)` | `#f5f6f0` |
| `card` / `popover` | `oklch(1 0 0)` | `#ffffff` | `oklch(0.21 0.025 145)` | `#111b11` |
| `card-foreground` / `popover-foreground` | = `foreground` | | = `foreground` | |
| `primary` (Rust orange) | `oklch(0.56 0.14 42)` | `#b65329` | `oklch(0.75 0.12 42)` | `#ee9370` |
| `primary-foreground` | `oklch(0.99 0.005 90)` | `#fdfcf8` | = `background` | `#0a120a` |
| `secondary` (WhatsApp green surface) | `oklch(0.94 0.05 145)` | `#d7f5d7` | `oklch(0.28 0.06 145)` | `#133015` |
| `secondary-foreground` | `oklch(0.32 0.08 145)` | `#133d17` | `oklch(0.93 0.03 145)` | `#dceedc` |
| `muted` | `oklch(0.96 0.01 100)` | `#f3f2eb` | `oklch(0.26 0.03 145)` | `#1b281b` |
| `muted-foreground` | `oklch(0.48 0.025 110)` | `#5e5f4f` | `oklch(0.74 0.03 120)` | `#a8ae99` |
| `accent` (green hover surfaces) | `oklch(0.92 0.07 148)` | `#c6f2cb` | `oklch(0.32 0.07 148)` | `#153c1d` |
| `accent-foreground` | `oklch(0.3 0.07 148)` | `#0f3718` | `oklch(0.96 0.02 145)` | `#eaf6ea` |
| `destructive` | `oklch(0.55 0.22 27)` | `#d40c1a` | `oklch(0.68 0.19 25)` | `#f75d59` |
| `destructive-foreground` | `oklch(0.99 0.005 90)` | `#fdfcf8` | = `background` | `#0a120a` |
| `border` (decorative) | `oklch(0.9 0.015 100)` | `#e0ded3` | `oklch(0.32 0.025 145)` | `#2b362b` |
| `input` (control borders) | `oklch(0.62 0.03 125)` | `#828a76` | `oklch(0.5 0.03 145)` | `#596859` |
| `ring` | = `primary` | `#b65329` | = `primary` | `#ee9370` |
| `checkerboard-a` | `oklch(0.97 0.004 100)` | `#f6f5f2` | `oklch(0.3 0.015 145)` | `#293029` |
| `checkerboard-b` | `oklch(0.88 0.008 100)` | `#d8d8d2` | `oklch(0.24 0.012 145)` | `#1c211c` |

Contrast ratios (WCAG 2.x), computed from these values:

| Pair | Light | Dark | Threshold |
|---|---|---|---|
| foreground / background | 17.62 | 17.49 | 4.5 |
| foreground / card | 18.13 | 16.17 | 4.5 |
| muted-foreground / background | 6.32 | 8.33 | 4.5 |
| muted-foreground / muted | 5.79 | 6.72 | 4.5 |
| primary-foreground / primary | 4.80 | 8.22 | 4.5 |
| primary / background (links, indicators) | 4.80 | 8.22 | 4.5 |
| secondary-foreground / secondary | 10.49 | 11.75 | 4.5 |
| accent-foreground / accent | 10.74 | 11.05 | 4.5 |
| destructive-foreground / destructive | 5.28 | 6.06 | 4.5 |
| destructive / background | 5.28 | 6.06 | 4.5 |
| ring / background | 4.80 | 8.22 | 3.0 |
| input / background | 3.51 | 3.22 | 3.0 |
| foreground / checkerboard-b | 12.64 | 15.05 | 4.5 |


Decorative `border` is intentionally subtle; meaningful control boundaries use `input`.
`bun run test` checks all contrast pairs and sRGB gamut. `bun run lint:design`
rejects raw colors, physical direction utilities, and arbitrary pixel sizes outside the UI kit.

- Radius: `--radius: 0.75rem`; sm/md/lg/xl/2xl/3xl/4xl multiply it by 0.6/0.8/1/1.4/1.8/2.2/2.6.
- Fonts: `--font-sans` uses the system UI stack; `--font-mono` uses SFMono-Regular, Menlo, Consolas; `--font-display` uses rounded system fonts with the sans stack as fallback. Fonts require no download.
- Shadows: `--shadow-2xs/xs/sm/md/lg/xl` use warm-neutral shadow tokens in light and deeper black in dark. `--shadow-sticker` combines a small contact shadow with a soft lifted shadow.
- Transparency: `--checkerboard-a`, `--checkerboard-b`, and `--checkerboard-size: 0.75rem` power `bg-checkerboard`, a repeating conic gradient that recolors with the theme.

### Theme

- `AppHeader` mounts `<ModeWatcher />` once in the root layout.
- The default follows the system, including live preference changes.
- `ThemeToggle` offers light, dark, and system radio choices. The override is stored in localStorage and restored by a blocking head script before the first paint; choosing system clears the override.
- Forced `.light` and `.dark` panels share the same tokens in the dev-only `/_design` showcase. Portaled overlays follow the page theme.
- Global reduced-motion durations are near zero so closing menus and dialogs still emit animation events and unmount.
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

### Feature components

Live in `src/lib/components/`, compose only `ui/` components, and take all
text from Paraglide.

- **DropZone** — a keyboard-operable Card accepting drag-and-drop and
  click-to-choose; the tool page owns paste (Ctrl/Cmd+V). Has hover and dragging states.
- **Preview** — the original image with detected boxes drawn over it, plus an
  eyedropper to pick the background color, explained by a Tooltip. In picker mode,
  arrows move a source-pixel crosshair, Shift accelerates, Enter/Space samples a
  clipped 3×3 neighborhood, and Escape cancels. Picking or cancelling returns
  focus to the toggle; a picked color is announced.
- **Controls** — the tolerance Slider; results update live (debounced) and show
  Progress/Skeleton while processing.
- **Grid** and **StickerCard** — cut-out stickers in Cards on the checkerboard,
  an optional export-provided size Badge, a remove button (Dialog confirmation),
  and a "use as tray icon" option. The non-tabular list uses roving focus: Tab
  enters the last active card, then its actions; arrows follow visual columns,
  Home/End select the first/last card, and Delete/Backspace opens confirmation.
  Removal focuses the next card, the previous card at the end, or the heading
  when empty. Cancelling focuses the remove action.
- **Export** — the primary "Download pack (.zip)" Button (WEBP stickers, PNGs,
  tray icon); shows a success toast.
- **LanguageSwitcher** — header DropdownMenu to change locale (see Part 2).
- **ThemeToggle** — header button switching light/dark.

The background swatch in **Controls** is the color selected from the user's
image. Its `--swatch: rgb(r g b)` custom property is the documented exception to
token-only styling; its border, size and radius still use theme utilities.

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
  `tool_*` (editor labels, actions, announcements and errors), `export_*`, `nav_*`,
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
Never format numbers by hand. The shared `src/lib/format.ts` helpers cache locale
formatters. Kilobytes use 1000 bytes, at most one fractional digit below 100 KB
and none at or above it; percentages have no fractional digits.

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
