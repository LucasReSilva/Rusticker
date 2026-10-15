## Context

See proposal.md for motivation. Sticker cards already render their preview canvas with intrinsic pixel dimensions and a square aspect ratio; the UI is client-side and the design-system specification requires non-essential transitions to respect reduced motion.

## Goals / Non-Goals

**Goals:** Add a small entrance cue without changing card geometry or editor state.

**Non-Goals:** Add skeleton UI, animation libraries, loading state in the Rust/WASM pipeline, or changes to how stickers are generated.

## Decisions

- Apply a CSS keyframe animation to the sticker preview canvas when the card mounts. This keeps animation out of JavaScript and avoids adding a dependency.
- Put the animation behind `prefers-reduced-motion: no-preference`; the base style is fully visible so reduced-motion users see the same content immediately.
- Preserve the existing explicit canvas width, height, and square layout classes so the animation does not affect grid geometry.
- Verify the computed animation state in focused component or browser tests, including a reduced-motion context. A CSS-only implementation is preferred over a skeleton because previews already have known dimensions and are drawn synchronously.

## Risks / Trade-offs

- [A transition may replay when a keyed card is recreated] → Limit it to mount-time presentation and keep its duration brief; ensure stable sticker keys remain unchanged.
- [Browser tests may differ in animation timing] → Assert styles or reduced-motion behavior deterministically rather than waiting for arbitrary wall-clock delays.
