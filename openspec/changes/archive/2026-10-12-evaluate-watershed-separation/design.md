## Context

See `proposal.md` and the current `sticker-detection` contract. The production core applies a 3x3 opening and then labels 8-connected foreground as indivisible components. `imageproc` already provides a squared Euclidean distance transform, but no watershed implementation.

## Goals / Non-Goals

**Goals:** evaluate a bounded, deterministic marker-controlled watershed candidate against current connected components on generated shapes; expose missed splits and false splits separately; document limits and memory considerations.

**Non-Goals:** put the candidate in production, infer semantics for real sticker images from synthetic results, or alter current output.

## Decisions

- Keep all candidate algorithm code in an integration-test harness so the experiment cannot change the shipped detector.
- Generate fixtures as binary masks in code: overlapping disks and narrow bridges represent intended multi-sticker cases; disks, rectangles, rings, L-shapes, stars, and dumbbells represent single-sticker risks; add noise and close-separated controls.
- Compute distance inside each component's padded bounding box using `euclidean_squared_distance_transform` on an inverted mask. Detect regional maxima, collapse plateaus deterministically, and flood descending distance with a priority queue and stable sequence-number tie breaking.
- Compare each predicted partition with ground-truth instance masks using region count, matched IoU, missed-split and false-split counts, and foreground coverage. Keep ambiguous identical silhouettes explicitly ambiguous instead of treating one interpretation as truth.
- Do not add a dependency or change application runtime. Treat the result as a recommendation for a later implementation issue.

## Risks / Trade-offs

- Geometry alone cannot distinguish one dumbbell-shaped sticker from two touching lobes; report both labelings as ambiguous and do not claim reliable automatic separation.
- Regional maxima may over-segment noisy or star-shaped silhouettes; record per-family false splits and consider marker suppression only as a documented parameter sweep.
- A full-frame `f64` distance array alone would use about 320 MB at the current 40-million-pixel input ceiling; prototype per-component padded boxes and do not infer WASM suitability from native tests.
- Watershed boundaries can leave pixels unlabeled; include foreground-coverage loss in the comparison and preserve this as an explicit design choice for any follow-up.

## Migration Plan

No migration. The evaluation harness is test-only and can be removed or retained without affecting production behavior.
