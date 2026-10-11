## Context

See proposal.md (Why). Starting point after `web-scaffold` is merged: `web/` is a SvelteKit 2 + Svelte 5 app on adapter-static, Tailwind CSS v4 is installed (`bunx sv add tailwindcss`), `web/src/app.css` exists with only the Tailwind import, Paraglide JS compiles `web/messages/{pt-BR,en,es}.json`, and the three pages exist with translated slugs (`/`, `/como-usar`, `/sobre` and the `/en`, `/es` variants). Locale detection (URL, then saved preference, then browser language, then `pt-BR`) and the URL patterns belong to `web-scaffold`; this change consumes them through the Paraglide runtime (`getLocale`, `locales`, `localizeHref`) and `web-scaffold`'s `switchLocale(locale)` in `src/lib/i18n/` (contract addendum R7). `web-scaffold` also creates `+layout.svelte` with the anchors `<!-- @design-tokens:header -->` and `<!-- @design-tokens:toaster -->` and an existing `<main id="main-content">` (R2), and its `web.yml` already runs `bun run --if-present lint:design` (R1).

Constraints: DESIGN.md "The Rule" (tokens only, logical utilities, text-free components), AGENTS.md (Bun only, English repo content), the privacy rule (nothing leaves the device), and the shared contract's file ownership (Wave B runs in parallel with `wasm-worker` and `pwa-seo`, which also touch `+layout.svelte` and `package.json`).

## Goals / Non-Goals

**Goals:**
- A complete token set (colors, radius, fonts, shadows, checkerboard) that `tool-ui` and `whatsapp-export` can use without adding a single raw value.
- The 11 shadcn-svelte components, adapted so they are text-free, logical-direction, reduced-motion safe, and keyboard accessible.
- Theme and language controls in a shared header.
- Automated guardrails (contrast test, `lint:design`) so later changes cannot silently break the rules.
- A dev-only `/_design` page that is truly absent from production output.

**Non-Goals:**
- Feature components (DropZone, Preview, Controls, Grid, StickerCard, Export).
- Any change to locale detection, URL patterns, or the missing-key check.
- RTL locale support itself (only the direction-neutral groundwork).
- Self-hosted brand web fonts or a logo/wordmark asset (the PWA icons belong to `pwa-seo`).

## Decisions

### D1. Brand palette: "Grape" violet primary, violet-tinted neutrals

Primary is a saturated grape violet: vibrant and sticker-like, clearly distinct from the chroma-key green the user's images use (so overlays and selection rings stay visible over a green photo), and far from the red `destructive` hue (27°), so "delete" never looks like a primary action. Neutrals carry a slight violet tint (hue 295-300, chroma <= 0.03) so the palette feels branded without hurting legibility.

Values are written as `oklch()` (the Tailwind v4 / shadcn-svelte convention); the hex columns are the sRGB equivalents, for reference only. All values are inside the sRGB gamut (no clipping).

| Token | Light (`:root`, `.light`) | ≈ hex | Dark (`.dark`) | ≈ hex |
|---|---|---|---|---|
| `background` | `oklch(0.99 0.004 300)` | `#fcfbfe` | `oklch(0.17 0.025 295)` | `#100d19` |
| `foreground` | `oklch(0.2 0.03 295)` | `#171322` | `oklch(0.97 0.008 300)` | `#f6f4fa` |
| `card` / `popover` | `oklch(1 0 0)` | `#ffffff` | `oklch(0.21 0.03 295)` | `#191525` |
| `card-foreground` / `popover-foreground` | = `foreground` | | = `foreground` | |
| `primary` | `oklch(0.52 0.24 300)` | `#822dda` | `oklch(0.74 0.15 305)` | `#c190f6` |
| `primary-foreground` | `oklch(0.99 0.004 300)` | `#fcfbfe` | `oklch(0.17 0.025 295)` | `#100d19` |
| `secondary` | `oklch(0.95 0.025 300)` | `#f1ebfd` | `oklch(0.3 0.05 300)` | `#322843` |
| `secondary-foreground` | `oklch(0.3 0.08 300)` | `#34234f` | `oklch(0.95 0.02 300)` | `#f0ecfa` |
| `muted` | `oklch(0.96 0.01 300)` | `#f3f0f8` | `oklch(0.26 0.03 295)` | `#252131` |
| `muted-foreground` | `oklch(0.48 0.03 295)` | `#5e5b6d` | `oklch(0.74 0.03 300)` | `#ada7bb` |
| `accent` (hover surfaces) | `oklch(0.94 0.03 300)` | `#eee7fd` | `oklch(0.32 0.06 300)` | `#382b4d` |
| `accent-foreground` | `oklch(0.28 0.08 300)` | `#2f1d4a` | `oklch(0.97 0.008 300)` | `#f6f4fa` |
| `destructive` | `oklch(0.55 0.22 27)` | `#d40c1a` | `oklch(0.68 0.19 25)` | `#f75d59` |
| `destructive-foreground` | `oklch(0.99 0.004 300)` | `#fcfbfe` | `oklch(0.17 0.025 295)` | `#100d19` |
| `border` (decorative) | `oklch(0.9 0.015 300)` | `#dfdce7` | `oklch(0.32 0.03 295)` | `#343041` |
| `input` (control borders) | `oklch(0.62 0.03 300)` | `#898296` | `oklch(0.5 0.03 300)` | `#666072` |
| `ring` | = `primary` | `#822dda` | = `primary` | `#c190f6` |
| `checkerboard-a` | `oklch(0.97 0.004 300)` | `#f5f4f7` | `oklch(0.3 0.015 295)` | `#2e2c35` |
| `checkerboard-b` | `oklch(0.88 0.008 300)` | `#d8d6dc` | `oklch(0.24 0.015 295)` | `#201e26` |

Contrast ratios (WCAG 2.x), computed from these values:

| Pair | Light | Dark | Threshold |
|---|---|---|---|
| foreground / background | 17.66 | 17.56 | 4.5 |
| foreground / card | 18.19 | 16.30 | 4.5 |
| muted-foreground / background | 6.41 | 8.25 | 4.5 |
| muted-foreground / muted | 5.86 | 6.73 | 4.5 |
| primary-foreground / primary | 6.09 | 7.87 | 4.5 |
| primary / background (links, indicators) | 6.09 | 7.87 | 4.5 |
| secondary-foreground / secondary | 12.05 | 11.92 | 4.5 |
| accent-foreground / accent | 12.48 | 11.85 | 4.5 |
| destructive-foreground / destructive | 5.28 | 6.10 | 4.5 |
| destructive / background | 5.28 | 6.10 | 4.5 |
| ring / background | 6.09 | 7.87 | 3.0 |
| input / background | 3.57 | 3.16 | 3.0 |
| foreground / checkerboard-b | 12.65 | 15.10 | 4.5 |

`border` is decorative only (separators, card edges) and is intentionally below 3:1; meaningful control boundaries use `input`. The two checkerboard cells differ by about 1.3:1 / 1.2:1, enough to read as a pattern without competing with the sticker. Light-theme cell B is a mid-light gray (not white) so a sticker's white outline stays visible against it.

Alternatives considered: **Rust orange** (fits the name, but needs a dark burnt orange for white text and sits close to the red `destructive` hue); **magenta** (vibrant, but within ~45° of red); **shadcn neutral** (rejected by the brief: Rusticker needs its own primary). The `oklch` values plus the contrast test (D7) are the source of truth; if a later tweak is needed, the test proves AA is preserved.

### D2. Other tokens

- **Radius:** `--radius: 0.75rem` (rounder than shadcn's 0.625rem, a soft "sticker" feel), with the derived `--radius-sm/md/lg/xl` steps that shadcn-svelte generates (`calc(var(--radius) ± n)`).
- **Fonts:** system stacks only: `--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`; `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; `--font-display: ui-rounded, var(--font-sans)` for the app name only. Rationale: no font download (no third-party request, works offline, nothing extra to precache, no layout shift); Noto/Segoe cover pt/es diacritics. Alternative: a self-hosted rounded variable font. Rejected for now (bundle weight and precache size); it can be added later by changing one token.
- **Shadows:** Tailwind v4 `--shadow-xs/sm/md/lg` redefined with a violet-tinted shadow color (`oklch(0.2 0.03 295 / α)`) in light and a deeper, more opaque black in dark. Also `--shadow-sticker` (a soft lifted shadow for sticker cards in `tool-ui`).
- **Checkerboard:** `--checkerboard-a`, `--checkerboard-b`, `--checkerboard-size: 0.75rem`, plus a Tailwind v4 `@utility bg-checkerboard` that paints `repeating-conic-gradient(var(--checkerboard-b) 0 25%, var(--checkerboard-a) 0 50%)` with `background-size: calc(var(--checkerboard-size) * 2)`. The size is a token, not a magic value. CSS gradients cost nothing to load and recolor through the variables when the theme changes.

All tokens are declared as CSS variables and mapped to Tailwind with `@theme inline`, exactly as shadcn-svelte's init produces, so `bg-primary`, `text-muted-foreground`, `rounded-lg`, `shadow-sm`, and so on work.

### D3. Theme mechanics: mode-watcher, `.dark` class, and nestable themes

`<ModeWatcher />` is mounted once, inside `AppHeader`, which the root layout renders on every page (D9). It reads and writes the `mode-watcher-mode` localStorage key, follows `prefers-color-scheme` when the mode is `system` (its default), toggles the `dark` class on `<html>`, and injects a blocking head script so prerendered pages render the right theme on first paint (no flash). `ThemeToggle` is an icon button (Sun/Moon from `@lucide/svelte`, `aria-hidden`) that opens a DropdownMenu with a radio group: light, dark, system. These map to `setMode('light' | 'dark')` and `resetMode()`. A plain cycle button was rejected because, once clicked, the user could not get back to following the system.

Token selectors are `:root, .light { …light… }` and `.dark { …dark… }` (on any element, not only `html`), and the Tailwind dark variant is `@custom-variant dark (&:where(.dark, .dark *):not(:where(.light, .light *)))`. This lets `/_design` render a forced-light panel and a forced-dark panel side by side on the same page, independent of the page theme.

### D4. Component kit: shadcn-svelte, adapted

`bunx shadcn-svelte@latest init` (base color "neutral", then fully replaced by D1 tokens; aliases `$lib/components/ui`, `$lib/utils`) and `bunx shadcn-svelte@latest add button card slider tooltip badge dialog dropdown-menu sonner progress skeleton separator`. The generated files are then edited, because they are our code (DESIGN.md):

1. **Text-free:** the only built-in strings in this set are screen-reader labels (Dialog's `sr-only` "Close", Sonner's region and close-button labels). They become props (`closeLabel`, `containerAriaLabel`, …) whose default is the corresponding `a11y_*` message (`m.a11y_close()`, `m.a11y_notifications()`). This keeps call sites simple and still allows overrides. Alternative: make the label a required prop at every call site. Rejected as error-prone; the result is identical for the user and the default is still localized. All other text (titles, button labels) is passed in as children, snippets, or props by the caller.
2. **Logical utilities:** physical classes in the generated code (`right-4`, `ml-auto`, `pl-8`, `pr-2`, `left-2`, `text-left`, …) are rewritten to `end-4`, `ms-auto`, `ps-8`, `pe-2`, `start-2`, `text-start`. Slide animations bound to Bits UI's `data-[side=left|right]` (the popper's physical side) are left as they are, because they follow the actual placement; `lint:design` allows them (D6).
3. **Focus:** keep shadcn's `focus-visible:ring-*` with `ring` = brand primary (contrast >= 3:1, D1). Every element that is focusable in the kit gets it, including the Slider thumb, DropdownMenu items (the `accent` highlight), and the Dialog close button.
4. **Icons:** every Lucide icon inside a component is `aria-hidden="true"`; icon-only usage requires an accessible name from the caller (documented in `/_design`).
5. **Toaster:** the Sonner wrapper reads the current mode from mode-watcher so toasts follow the theme, and uses theme tokens for its colors (no rich-color hex).

### D5. Reduced motion: one global rule

In `app.css`:
`@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`.
We use a near-zero duration rather than `animation: none` on purpose. Bits UI presence logic waits for `animationend` before unmounting closing menus and dialogs, and `none` would never fire it (content would stay mounted). One global rule covers all generated components, including `tw-animate-css` enter/exit classes and the Skeleton pulse, without editing each one. New feature code still prefers `motion-safe:`.

### D6. Guardrail: `bun run lint:design` (`web/scripts/lint-design.ts`)

A small Bun script (no new dependency) that scans `web/src/**/*.{svelte,ts,js,css}` except `web/src/app.css` and test files. It fails (exit 1, `file:line` plus a hint) on:
- **Raw colors:** `#rgb`/`#rrggbb(aa)` literals in class or style contexts, `rgb(`/`rgba(`/`hsl(`/`hsla(`/`oklch(` calls, and Tailwind arbitrary colors (`bg-[#…]`, `text-[rgb(…)]`).
- **Physical direction utilities:** class tokens matching `(^|[\s:"'{])-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-` and `text-left`/`text-right`, with suggestions (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `border-s`, `rounded-s`, `text-start`, …). Allowed exceptions: animation utilities scoped to `data-[side=left|right]:` (D4.2), and lines with an explicit `// lint-design-ignore: <reason>` comment.
- **Magic pixel values outside `components/ui/**`:** arbitrary `[NNpx]` values in feature components and routes. The generated `ui/` kit keeps shadcn's few arbitrary values (for example the 3px focus ring), which are part of the kit's own definition.

It is wired as `"lint:design"` in `package.json`. CI needs no edit: `web-scaffold`'s `web.yml` already runs `bun run --if-present lint:design`, which was a no-op until this script existed and becomes a real check once this change merges. A self-test (`bun test` fixtures in `web/scripts/lint-design.test.ts`) covers a passing file and each failing pattern. Alternatives: an ESLint plugin (for example `eslint-plugin-tailwindcss`) does not yet cover Tailwind v4 logical-property rules reliably and would edit the shared ESLint config owned by `web-scaffold`; Stylelint covers CSS only.

### D7. Contrast test: `web/src/lib/theme/contrast.test.ts`

A Vitest test reads `web/src/app.css` as text, extracts the token values from the light (`:root`) and dark (`.dark`) blocks, converts `oklch` to sRGB (OKLab matrices, about 20 lines in `contrast.ts`, no dependency), and asserts the pairs in D1's table against their thresholds. Each failure message names the pair and theme. Values must be inside the sRGB gamut; the test also fails on clipping so the hex shown in docs is honest. This turns the spec's AA requirement into a CI check that `tool-ui` cannot accidentally break.

### D8. LanguageSwitcher

- Trigger: a ghost icon+label button (Lucide `Languages`, `aria-hidden`) showing the active language's short code, with the accessible name `m.lang_switcher_label()`.
- Items: a DropdownMenu radio group over `locales` from the Paraglide runtime, so adding a locale needs no code change. Each language is labeled by its **autonym**, computed with `new Intl.DisplayNames([tag], { type: 'language' }).of(tag)` and capitalized with `toLocaleUpperCase(tag)` ("Português (Brasil)", "English", "Español"). Each item has `lang={tag}` so screen readers pronounce it correctly. Autonyms are deliberately not catalog messages: they are the same in every UI language, and computing them keeps "add a locale = add a JSON file" true. The `lang_*` keys cover the control's label and hint.
- Action: `await switchLocale(tag)` from `web-scaffold`'s `$lib/i18n` (contract addendum R7). It persists the preference (localStorage `PARAGLIDE_LOCALE`), sets the locale **without a reload**, and client-navigates with `goto` to the localized href of the current page, applying the translated slug patterns (`/como-usar` → `/es/como-usar` → `/en/how-to-use`). The root layout re-renders localized text on the locale change. LanguageSwitcher owns none of that logic: it only renders the menu and calls `switchLocale`. That keeps one implementation of slug mapping, and the header and the rest of the page change language together. Editor state survives because `tool-ui` keeps it in a module-scope singleton (R7), so the switcher needs no confirmation hook. Alternative rejected: Paraglide's default `setLocale` full reload, which would discard the user's detected stickers.

### D9. AppHeader and layout wiring

`AppHeader.svelte`: a skip link (`m.a11y_skip_to_content()`, visually hidden until focused, targets `#main-content`), the app name (`m.app_name()` from `web-scaffold`, `font-display`, links to `localizeHref('/')`), a `<nav aria-label={m.a11y_main_navigation()}>` with the how-to-use and about links (`nav_*` messages and `localizeHref`, `aria-current="page"` on the active one), then ThemeToggle and LanguageSwitcher. Mobile-first flex layout that wraps. No fixed widths, so longer labels wrap instead of truncating.

`+layout.svelte` (contract addendum R2): the whole block from `<!-- @design-tokens:header -->` to `<!-- /@design-tokens:header -->` (web-scaffold's minimal unstyled header, markers included) is replaced by `<AppHeader />` and `<!-- @design-tokens:toaster -->` by `<Toaster />` (the svelte-sonner wrapper). The only other change is the two import lines those tags need in the layout's existing `<script>`; a component cannot be used without an import, and Svelte allows only one instance script. `<ModeWatcher />` is mounted inside `AppHeader.svelte`, so the layout needs nothing more. The skip link targets the existing `<main id="main-content">`. `app.css` is already imported by `web-scaffold`'s layout. The `<!-- @pwa-seo:registration -->` anchor and everything else stay untouched.

### D10. `/_design`: dev-only and absent from production output

- `web/src/routes/_design/+page.ts`: `export const prerender = false; export const ssr = false;` and `load` throws `error(404)` when `!import.meta.env.DEV`.
- `+page.svelte` contains only `{#if import.meta.env.DEV}{#await import('./Showcase.svelte') then mod}<mod.default />{/await}{/if}`. Vite replaces `import.meta.env.DEV` with `false` in the production build, so the dynamic import is removed and `Showcase.svelte` (with its `design_*` messages, which Paraglide then tree-shakes) is never emitted.
- The route is linked from nowhere, so the prerender crawler never reaches it. `prerender = false` makes that explicit, and `pwa-seo`'s sitemap lists only the public pages. In production, `/_design` reaches adapter-static's `404.html` SPA fallback, whose client router runs the `load` above and shows the not-found page.
- `Showcase.svelte` renders, for every `ui/` component and variant (button variants × sizes × disabled, card, badge variants, slider, tooltip, dialog trigger, dropdown menu, toast triggers, progress values, skeleton, separator), plus the color swatches with their contrast ratios, typography, radius and shadow steps, and the checkerboard. It does this twice: in a `.light` panel and a `.dark` panel (D3). Overlays (dialog, menus, tooltips, toasts) are portaled to `<body>` and so use the page theme. The page has a ThemeToggle to view them in both themes. All visible text comes from `design_*` messages.
- Verification after `bun run build`: no file under `web/build/` contains the marker attribute `data-design-showcase`, and there is no `build/_design*` file.
- Note on the folder name: SvelteKit 2 treats `_design` as a normal route segment (only `+`-prefixed files are special). If Paraglide's URL patterns from `web-scaffold` do not match `/_design`, the dev server still serves it unprefixed in the active (base or saved) locale, which is enough for a dev tool.

### D11. Messages added (all three locales, real translations)

| Key | pt-BR | en | es |
|---|---|---|---|
| `theme_toggle_label` | Alterar tema | Change theme | Cambiar tema |
| `theme_light` | Claro | Light | Claro |
| `theme_dark` | Escuro | Dark | Oscuro |
| `theme_system` | Sistema | System | Sistema |
| `lang_switcher_label` | Mudar idioma | Change language | Cambiar idioma |
| `lang_current` | Idioma atual: {language} | Current language: {language} | Idioma actual: {language} |
| `a11y_close` | Fechar | Close | Cerrar |
| `a11y_skip_to_content` | Pular para o conteúdo | Skip to main content | Saltar al contenido |
| `a11y_main_navigation` | Navegação principal | Main navigation | Navegación principal |
| `a11y_notifications` | Notificações | Notifications | Notificaciones |
| `a11y_loading` | Carregando… | Loading… | Cargando… |
| `design_title` | Design system | Design system | Sistema de diseño |
| `design_intro` | Página de desenvolvimento… | Development-only page… | Página solo para desarrollo… |
| `design_theme_light` / `design_theme_dark` | Tema claro / Tema escuro | Light theme / Dark theme | Tema claro / Tema oscuro |
| `design_section_*` | colors, typography, radius, shadows, transparency, buttons, cards, badges, slider, tooltip, dialog, menu, toasts, progress, skeleton, separator | | |
| `design_sample_*` | sample texts used by the showcase (title, body, action, toast text, menu items) | | |

The exact `design_section_*` / `design_sample_*` set is finalized while building the showcase; every key is added to all three catalogs in the same commit and `bun run i18n:check` must pass.

### D12. E2E tests (Playwright) for browser behavior

Playwright specs live in `web/e2e/design-tokens/` and cover what only a real browser proves: theme persistence and system follow (`colorScheme` emulation), language switching without reload, focus rings, reduced motion, the header on all 9 URLs, the 320px overflow check, and `/_design` returning 404 in production. Specs run in the default project (build plus preview under `BASE_PATH=/Rusticker`), except the `/_design` specs, which run in the `dev` project (`bun run dev`) that `wasm-worker` adds. Vitest keeps the contrast math, the token parser and the lint rules. Only synthetic data; no fixtures are committed.

## Risks / Trade-offs

- [Re-render on locale change (the layout's `{#key locale}`) remounts the header, so focus on the language trigger is lost] → After `switchLocale` resolves, LanguageSwitcher moves focus back to its (new) trigger. Task 6.2 verifies the keyboard path.
- [`+layout.svelte` and `package.json` are edited in parallel by `wasm-worker` and `pwa-seo`] → Only the two `@design-tokens:*` anchors and two import lines change in the layout. Only additions in `package.json`. On a `bun.lock` conflict, take develop's version and re-run `bun install` (contract rule).
- [shadcn-svelte CLI output changes between versions (new class names, new physical utilities)] → `lint:design` catches physical utilities. Record the CLI version used in the commit message. Components are our code after generation.
- [The global reduced-motion rule could hide meaningful progress feedback] → Progress conveys state through its value and `aria-valuenow`, not motion. Skeleton is decorative and is announced through `a11y_loading`.
- [`lint:design` regex false positives (for example `#` in URLs or ids)] → Color checks apply only to class/style attribute values, `style:` directives, and CSS blocks. A `lint-design-ignore` escape hatch requires a reason. The self-test fixtures cover the known shapes.
- [mode-watcher's head script vs. a future Content-Security-Policy] → No CSP today (static hosting on GitHub Pages). If `pwa-seo` or a later change adds one, it must allow that inline script (hash).
- [Privacy] → No network access added. Preferences (`mode-watcher-mode`, the Paraglide locale key) are stored only in the browser and contain no user data.

## Migration Plan

Additive. The branch `feature/design-tokens` merges after `web-scaffold`. Rollback = revert the merge commit. Pages fall back to the unthemed scaffold, and `tool-ui` must not start until this is merged.

## Open Questions

- None blocking. Resolved by the contract addendum: the extra files (`web/src/lib/utils.ts`, `web/scripts/lint-design.ts` + test, `web/src/lib/theme/{contrast.ts,contrast.test.ts}`) are accepted, CI is pre-wired (R1), the layout anchors and `main#main-content` exist (R2), and language switching goes through `switchLocale` (R7). DESIGN.md says shadcn-svelte init happens in `web-scaffold`, but the contract assigns `components.json` to this change, so init happens here and the last task corrects DESIGN.md.
- If `web-scaffold`'s layout already imports `AppHeader`/`Toaster` placeholders, reuse them instead of adding the two import lines.
