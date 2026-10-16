## Context

The frontend is a SvelteKit application using Svelte 5, Vite, Tailwind CSS v4, and shadcn-svelte components. Theme tokens and typography are defined in `web/src/app.css`. See `proposal.md` and `specs/ui-component-catalog/spec.md` for motivation and behavior.

## Goals / Non-Goals

**Goals:**
- Provide an isolated developer preview with repeatable stories for foundational controls.
- Reuse the product's existing style tokens and expose both supported visual themes.
- Keep all Storybook runtime and assets local and separate from the product build.

**Non-Goals:**
- Replacing the existing development-only design showcase route.
- Changing component APIs, production routing, localization catalogs, or application behavior.
- Adding visual-regression infrastructure or catalog deployment.

## Decisions

- Use the official SvelteKit framework integration with Storybook 10.6.2, which supports the repository's Svelte 5 and Vite 8 peer ranges. Use the Svelte CSF addon to write native `.stories.svelte` files. This matches the Svelte compiler and avoids a separate rendering shim; an older Svelte/Vite builder integration would add compatibility risk.
- Disable automatic Svelte prop docgen because the initial primitives expose concise, explicit story controls and component descriptions; this avoids a slow, warning-producing transformation pass while keeping story documentation intentional and reviewable.
- Keep configuration and stories under `web/.storybook/` and `web/src/lib/components/ui/` so Storybook runs from the web package and discovers the actual design-system components.
- Import `web/src/app.css` into the preview and wrap each story with a theme class selected through a Storybook global toolbar. The application stylesheet remains the source of truth for Tailwind utilities, colors, and font stacks; no remote fonts or CDN are configured.
- Disable Storybook telemetry so starting the local catalog does not send usage events to a third party.
- Add `storybook` and `build-storybook` Bun scripts and development-only dependencies. Keep static Storybook output ignored and do not wire Storybook into the SvelteKit production build or route set.
- Add stories for Button, Card, Badge, Slider, Progress, and Dialog. Use localized product text only when a component requires actual application copy; generic sample content in developer stories is documentation, not product UI.

## Risks / Trade-offs

- **Framework integration may discover application-only Vite plugins or aliases →** verify both the development server and static Storybook build; adjust only Storybook's Vite configuration if the app's PWA plugin conflicts.
- **Components that import app routes or browser-only services may not render in isolation →** keep the initial catalog focused on primitives and give stories deterministic props and state.
- **Storybook upgrades can change framework compatibility →** pin compatible major versions in the Bun lockfile and validate the local preview/build commands.

## Migration Plan

Install and lock the Storybook development dependencies with Bun, add configuration and stories, then verify the local preview, static catalog build, production app checks, and production output separation. Rollback by reverting the development-only dependencies, scripts, configuration, and stories.
