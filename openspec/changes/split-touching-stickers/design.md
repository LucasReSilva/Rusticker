## Context

See `proposal.md` for motivation and `specs/sticker-detection/spec.md` for the behavior contract. Standard detection currently turns a binary alpha/color mask into 8-connected regions and returns 512x512 crops. The #32 synthetic evaluation found both useful candidate splits and substantial ambiguity, so proposal generation must be separate from automatic detection.

## Goals / Non-Goals

**Goals:** Keep the standard detector byte-for-byte behaviorally stable; run bounded candidate generation in Rust/WASM; expose a clear review, accept, discard, and undo flow; keep all pixels local.

**Non-Goals:** Run a watershed on every image, infer sticker intent, guarantee semantically correct boundaries, add model inference, or change export formats.

## Decisions

- Add a separate WASM operation over one existing 512x512 sticker image. Treat nonzero alpha as the mask and use the existing squared Euclidean distance primitive for deterministic peak seeding and priority flooding. Return no proposal if fewer than two separated peaks survive or a bounded-work check fails. This avoids changing `detect` and avoids resending the original full image.
- Preserve the source sticker in editor state while candidate stickers are shown. Accept replaces it as one undoable edit; discard leaves state untouched. Candidate images use the existing crop framing and reading-order utilities.
- Keep candidate generation synchronous inside the existing worker. Its fixed 512x512 input bounds memory and avoids another worker or dependency; run it only after an explicit user action.
- Keep the first UI review simple and accessible in the sticker card: show candidate previews and explicit Accept/Discard controls. All labels and status messages go through Paraglide catalogs.
- Return a language-neutral `NoSplitProposal` code when the operation cannot propose at least two regions. The UI maps it to a localized explanation and keeps the original unchanged.

## Risks / Trade-offs

- Distance peaks can over-split rings, stars, and ambiguous dumbbells → proposals are never applied automatically and preserve the original for discard or undo.
- Rasterized 512px sticker output may have lost fine source detail → proposal is explicitly an assist and the original remains available.
- Flood ties or iteration order could vary → use integer priorities, fixed neighbor order, stable marker ordering, and byte-equality tests.
- Flood work or label counts could grow unexpectedly → cap input dimensions, marker count, queue growth, and total visited pixels; return `NoSplitProposal` on the cap.
- Candidate pieces may differ in inferred source bounds → calculate bounds in the 512px frame and map them proportionally inside the original bbox; validate their union and non-overlap before accepting.
