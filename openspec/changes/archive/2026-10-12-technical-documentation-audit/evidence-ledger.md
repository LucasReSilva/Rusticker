# Documentation evidence ledger

This ledger maps claims in `ARCHITECTURE.md` to the implementation and
behavior evidence reviewed for issue #56. Research and library references
support only the scope stated in the final column; project-specific behavior
is established by repository code, tests, and OpenSpec contracts.

| Claim documented | Implementation evidence | Test/spec evidence | Reference scope |
|---|---|---|---|
| Background pixels are classified from RGB converted to HSV using the selected color and tolerance. | `core/src/color.rs`; `core/src/mask.rs` | `core/src/color.rs` tests for conversion, green range, selected-color behavior, and monotonic tolerance; `openspec/specs/sticker-detection/spec.md` | Smith [1] explains RGB/HSV transforms only; it does not validate Rusticker's threshold constants. |
| The input alpha channel is ignored during classification and extraction. | `core/src/mask.rs::foreground_mask`; `core/src/alpha.rs::extract` | No dedicated transparent-input test was found; the detection spec does not define input-alpha semantics. Issue #52 tracks investigation. | No external reference; this is a code observation and documented limitation. |
| A 3 × 3 square opening cleans the foreground mask. | `core/src/mask.rs::open_3x3` (`Norm::LInf`, radius 1) | `core/src/mask.rs` tests for a removed 2 × 2 speck, retained 3 × 3 block, and retained 3-pixel bridge; detection spec | `imageproc 0.25.1` [2] documents erosion followed by dilation; mask size is project configuration. |
| Connected components use 8-connectivity and keep regions of at least 0.4% of the input area. | `core/src/components.rs::find_components` | Component tests in `core/src/components.rs`; detection spec | `imageproc 0.25.1` [3] documents connected-component labeling. Connectivity choice and area cutoff are project behavior, not library recommendations. |
| Output alpha is a local mean of binary component membership, not general alpha matting. | `core/src/alpha.rs::extract` | Alpha tests in `core/src/alpha.rs`; detection spec | Li et al. [10] survey learned matting methods for comparison; it does not describe the local mean used by Rusticker. |
| Stickers are ordered into rows and then left-to-right; crops are framed at 512 × 512 with 480 px content. | `core/src/order.rs`; `core/src/frame.rs` | Order/frame tests in those modules; detection spec | `image 0.25.10` [4] identifies the Lanczos3 sampling filter; premultiplication and the frame dimensions are project implementation. |
| The browser decodes images locally, transfers a defensive pixel copy to the worker, and transfers JS-owned results back after freeing the Rust result. | `web/src/lib/tool/decode.ts`; `web/src/lib/detection/index.ts`, `worker.ts`, `engine.ts` | `decode.test.ts`, `detection/index.test.ts`, `detection.integration.test.ts`; `openspec/specs/detection-runtime/spec.md` | wasm-bindgen [5], MDN Web Workers [6], transferable objects [7], and Comlink [8] document the relevant interfaces and transfer model. |
| New detections supersede old callers, but synchronous WASM work is not interrupted; failed workers are recreated. | `web/src/lib/detection/latest.ts`, `index.ts` | `latest.test.ts`, `index.test.ts`; detection-runtime spec | Web Workers [6] and Comlink [8] provide boundary context; scheduling and recovery policy are project behavior. |
| Sticker encoding, ZIP creation, and download are local browser operations. | `web/src/lib/export/canvas.ts`, `quality.ts`, `export.ts`, `zip.ts`, `download.ts` | Export, ZIP, and controller tests; `openspec/specs/sticker-export/spec.md` | Browser and JSZip APIs are identified as implementation dependencies; no research paper is used to justify product-specific packaging rules. |
| Watershed and image matting papers are comparison/future-work references, not current Rusticker algorithms. | Current pipeline modules above; no watershed or model inference path exists in the detector. | Roadmap issues #32–#34 and #54–#55; current detection spec | Bai and Urtasun [9] discuss watershed-based instance segmentation; Li et al. [10] survey image matting. |

The bibliography numbering matches `ARCHITECTURE.md`. External links and the
rendered Mermaid diagrams are checked in task 4.2 before the change is
completed.
