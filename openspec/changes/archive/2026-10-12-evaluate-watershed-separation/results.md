# Watershed Evaluation Results

## Method

The production baseline is the existing 3x3 morphological opening followed by 8-connected labeling. The harness omits production's 0.4% component-area filter, so the baseline is an approximation for these generated fixtures. A test-only candidate computes squared Euclidean distance inside each component bounding box with an explicit one-pixel outside border, collapses equal-height regional-maxima plateaus, drops peaks below 25% of the component's highest **squared** distance (equivalent to half its largest linear radius), applies an 8-pixel minimum separation, and performs a deterministic maximin priority flood. This is a deliberately small proof of concept, not a production watershed implementation or a complete reference watershed.

All masks and per-instance ground truth are generated in Rust at 96x80 pixels. The harness compares exact region counts, greedy one-to-one mean IoU (unmatched ground-truth instances contribute zero), deterministic repeatability, and foreground coverage. The reported missed/false split values are count differences only; they do not establish instance correspondence. IoU and the ambiguous-shape cases provide additional evidence, though this small synthetic set cannot establish general accuracy. No source images or private data are used.

## Results

| Fixture family | Baseline regions / expected | Candidate regions / expected | Candidate finding |
|---|---:|---:|---|
| Overlapping disks | 1 / 2 | 2 / 2 | Recovers the intended split; mean IoU 0.861 |
| Noisy pair with 3px bridge | 1 / 2 | 2 / 2 | Recovers split after opening; mean IoU 0.983 |
| 1px bridge | 2 / 2 | 2 / 2 | Existing opening removes the bridge, so watershed adds no benefit |
| 3px, 6px, and 12px bridges | 1 / 2 each | 2 / 2 each | Recovers intended count; mean IoU 0.983, 0.968, and 0.940 |
| Edge-touching and close-separated disks | 2 / 2 each | 2 / 2 each | Same count as baseline; mean IoU at least 0.993 |
| Single disk (including one clipped at the left image edge), rectangle, and L | 1 / 1 each | 1 / 1 each | No extra regions; IoU at least 0.995 |
| Single ring | 1 / 1 | 7 / 1 | Six extra regions; mean IoU 0.376 |
| Single star | 1 / 1 | 5 / 1 | Four extra regions; mean IoU 0.988 |
| Same dumbbell mask interpreted as one sticker | 1 / 1 | 2 / 1 | One extra region; mean IoU 0.500 |
| Same dumbbell mask interpreted as two stickers | 1 / 2 | 2 / 2 | Intended count recovered; mean IoU 0.992 |

The candidate assigned every foreground pixel in these fixtures (100% coverage), and repeated runs produced identical labels. It does not emit watershed lines, so full coverage says nothing about boundary quality. The ring and single-dumbbell extra regions remain severe despite full coverage. The same dumbbell pixels yield the same two candidate regions under either ground-truth interpretation, demonstrating that binary shape alone cannot resolve sticker intent.

## Recommendation

**Conditional go for a user-requested, reviewable assist; no-go for automatic replacement of the current detector.** The small synthetic sample shows a useful signal for simple overlapping lobes, but also clear false splits on valid single shapes. A future implementation should keep the original sticker available, show proposed regions, allow acceptance or undo, and never silently replace current behavior. Broader synthetic variation and browser/WASM measurements are still required before enabling it by default.

The harness is native Rust test code only. `imageproc` provides a linear-time squared Euclidean distance transform, but its output is `f64`; one full-frame array at the 40-million-pixel input ceiling would occupy about 320 MB before labels and queue storage. Per-component padded bounding boxes reduce typical work, but browser peak memory and latency have not been measured. The test-only greedy flood is not a complete reference watershed and must not be used as production evidence beyond these fixtures.

## References

- `imageproc` 0.25.1 [`euclidean_squared_distance_transform`](https://docs.rs/imageproc/0.25.1/imageproc/distance_transform/fn.euclidean_squared_distance_transform.html): the crate's existing linear-time squared Euclidean distance primitive and `f64` output type.
- scikit-image's [watershed example](https://scikit-image.org/docs/stable/auto_examples/segmentation/plot_watershed.html) and [`watershed` API notes](https://scikit-image.org/docs/stable/api/skimage.segmentation.html): distance maxima as markers for overlapping objects, priority-queue tie handling, and marker-controlled flooding. These document a reference approach, not Rusticker accuracy.
- Fioravante de Siqueira et al., [“Segmentation of nearly isotropic overlapped tracks in photomicrographs using successive erosions as watershed markers”](https://arxiv.org/abs/1706.03282), arXiv:1706.03282 (2017): reports watershed-marker use in nearly isotropic photomicrographs. Its domain differs from arbitrary sticker silhouettes and does not validate Rusticker's results.
- Bandara, [“Image Segmentation using Unsupervised Watershed Algorithm with an Over-segmentation Reduction Technique”](https://arxiv.org/abs/1810.03908), arXiv:1810.03908 (2018): discusses over-segmentation and a reduction approach in its image domain; cited to motivate testing this failure mode, not to claim a solution for stickers.
