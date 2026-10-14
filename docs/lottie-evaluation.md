# Lottie micro-interaction evaluation

**Evaluated:** 2026-10-14
**Decision:** Do not add a Lottie player for Rusticker's current short, decorative state changes. Use CSS or a small static SVG. Revisit only for an animation whose visual value cannot be delivered simply, and keep any later player and animation locally bundled and lazy-loaded.

## Scope and method

The isolated [prototype](lottie-evaluation/prototype/) compares a CSS pulse with the same generated 21-frame Lottie JSON rendered by the SVG-only entry from `lottie-web` and the canvas player from `@lottiefiles/dotlottie-web`. Exact versions are pinned in the prototype's `package.json` and `bun.lock`; both runtimes declare MIT licenses ([lottie-web license](https://github.com/airbnb/lottie-web/blob/master/LICENSE.md), [dotLottie Web package metadata](https://github.com/LottieFiles/dotlottie-web/blob/main/packages/web/package.json)). The [dotLottie JavaScript player documentation](https://docs.lottiefiles.com/en/runtimes/distributions/js) describes its browser canvas and JSON support; the [lottie-web renderer options](https://github.com/airbnb/lottie-web/wiki/loadAnimation-options) document SVG and canvas modes.

From `docs/lottie-evaluation/prototype/`, run `bun install`, `bun run build`, and `bun run preview -- --host 127.0.0.1 --port 4179`. The dotLottie package falls back to a CDN for its WASM engine unless `setWasmUrl()` is set, so the prototype copies that exact pinned package file into `dist/assets/` and sets the local URL before player construction. To reproduce startup timings, set `CHROME_PATH` to a Chromium/Chrome executable, set `BENCH_ROUNDS=3`, then run `bun run bench`. The CDP harness launches one isolated headless browser, creates a fresh browser context and disables cache for every page navigation, interleaves the three variants, and blocks host resolution except for loopback. It records each browser `first-contentful-paint` entry. For TBT it starts at FCP and ends at the first five-second CPU-quiet window no earlier than the page load event; a long task resets that quiet window. The app pages have no network work after load. This is a reproducible Lighthouse-style TBT measurement for the synthetic pages, not a Lighthouse score. The prototype source contains no CDN or remote animation URL. This environment injects a Kaspersky filtering script into browser pages; its non-loopback request is blocked by the resolver, so that environment request is excluded from app measurements.

Vite reports minified and gzip bytes for each production chunk. The sizes below group the optional player runtime with its entry, shared preload helper, and the generated animation-data chunk; dotLottie also includes its separate WASM engine. They exclude HTML and CSS, which all options need. No production app dependency or user animation asset was added.

## Bundle and startup cost

| Option | Optional payload, minified | Optional payload, gzip | Evidence |
| --- | ---: | ---: | --- |
| CSS baseline | 0 kB JS | 0 kB JS | Browser-native CSS animation; no animation runtime or data file. |
| `@lottiefiles/dotlottie-web` 0.81.0 | 1,303.92 kB | 520.73 kB | JS chunks 65.85/16.12 kB plus local WASM 1,238.07/504.61 kB. |
| `lottie-web` 5.13.0 SVG-only entry | 247.29 kB | 65.68 kB | SVG player chunk 243.62/63.67 kB, entry 0.61/0.38 kB, shared helper 2.60/1.27 kB, animation-data chunk 0.56/0.36 kB. |

These are Vite 8.0.16 output sizes for the isolated prototype, not a predicted whole-site size. The dotLottie WASM makes its first-play payload about 455 kB larger over gzip than the SVG-only `lottie-web` path, despite the smaller JavaScript. Both remain materially larger than CSS for one pulse. The Lottie entry points dynamically import the player only when reduced motion is not requested. In reduced-motion Chromium runs, both player chunks were absent from their loaded documents; the static status text remained present.

The checked-in harness ran three cold navigations per option using Chrome 156.0.8078.4 in headless mode on the local production preview, with no CPU throttling. Median FCP was 48 ms for CSS (samples 64, 48, 48 ms), 44 ms for SVG Lottie (40, 44, 48 ms), and 44 ms for dotLottie (56, 40, 44 ms). The TBT value was 0 ms for every run; no long task exceeded 50 ms in the measured intervals, which were approximately 5 seconds after FCP. The FCP samples overlap and vary by more than the 4 ms median gap, so they do not establish a player performance advantage. The injected filtering script is blocked in every run; the timings are controlled local comparisons, not a claim about production or low-end devices. Measure on representative low-end hardware before adopting a player.

## Accessibility and offline behavior

- The completion state is plain text in every prototype page, so meaning never depends on motion.
- The decorative SVG and canvas are hidden from assistive technology. Under `prefers-reduced-motion: reduce`, CSS stops its animation and both Lottie pages skip the player import and initialization.
- The normal pages rendered the generated animation with each local player while host resolution blocked non-loopback hosts. dotLottie used the copied local WASM engine rather than its CDN fallback. No remote animation, CDN, telemetry, or user image is used by the prototype.
- The prototype uses one simple vector shape. It does not establish compatibility, memory use, or frame cost for complex production artwork. Canvas output also needs a separate accessible text equivalent for any meaningful state.

## Recommendation

Keep CSS or a small static SVG for current micro-interactions. If a future design has a clear need for Lottie, dynamically import the player only when the animation is needed and motion is allowed, bundle the animation and any WASM engine locally, and preserve a localized static state. Require repeatable FCP/TBT and memory measurements on representative low-end devices, reduced-motion and screen-reader review, and a production-build size check before adding it to `web/`.
