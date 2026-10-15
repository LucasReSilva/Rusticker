## Context

See [proposal.md](proposal.md). The design system already applies a global reduced-motion preference. The evaluation therefore compares isolated, local-only implementations while preserving a static text status as the source of meaning.

## Goals / Non-Goals

**Goals:**

- Make player cost reproducible from pinned dependencies and one synthetic animation.
- Separate initial-page startup cost from the cost of loading a player only when an interaction is requested.
- Verify that the preference can prevent both playback and player loading while the status remains visible.

**Non-Goals:**

- Integrating animation into Rusticker's Svelte routes or measuring user-image flows.
- Treating one desktop browser sample as a mobile performance guarantee.

## Decisions

1. **Compare three implementations of one decorative pulse.** Use CSS, `lottie-web`'s SVG-only entry, and `@lottiefiles/dotlottie-web`'s canvas player. A shared generated Lottie JSON keeps artwork complexity constant. The pinned Vite build produces minified and gzip byte counts without adding either player to the application dependencies.

2. **Load players lazily after checking motion preference.** The prototype dynamically imports each player only when `prefers-reduced-motion` is not `reduce`. This shows the best viable FCP path for a one-shot micro-interaction and demonstrates how a reduced-motion user can avoid runtime transfer and initialization. A static completion sentence remains present in all cases.

3. **Keep every prototype input local.** Serve the built prototype from loopback, use a generated vector animation, disable browser background networking, and restrict hostname resolution to loopback during the browser check. No CDN URLs or user images are included.

4. **Measure bytes exactly and interpret browser timings conservatively.** Record Vite's per-chunk minified and gzip sizes. FCP is read from the browser's `first-contentful-paint` entry and TBT is the sum of long-task duration above 50 ms for a cold page load. If the local headless environment cannot complete a stable timing run, report FCP/TBT as unavailable and do not infer values from bundle sizes.

5. **Recommend native motion for this use case.** CSS and a small inline/static SVG have no player runtime and fit short decorative state changes. Keep Lottie as a future opt-in for a distinct, expressive animation only if the measured UX value justifies its transfer and main-thread work; then lazy-load a locally bundled player and asset and retain a static accessible state.

## Risks / Trade-offs

- [A tiny generated animation understates complex real artwork cost] → Report runtime and asset bytes separately, and require the actual candidate animation to be measured before adoption.
- [A single headless desktop cannot establish mobile performance] → Treat FCP/TBT as indicative only and require representative low-end mobile profiling in any implementation change.
- [Lottie frames may contain unsupported or expensive features] → The prototype uses only a simple shape; validate actual animation features and rendering before selecting a player.
- [Canvas output can be invisible to assistive technology] → Mark it decorative and keep the meaningful state in regular text.

## Migration Plan

No product migration applies. The isolated prototype is not imported by `web/`; remove the prototype and dependency lock if the evaluation is later archived without preserving its reproducibility value.
