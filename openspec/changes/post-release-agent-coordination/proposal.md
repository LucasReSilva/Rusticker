## Why

Rusticker's v0.2.1 release leaves several independently valuable improvements, but parallel implementation can duplicate work or collide in shared code. Labels, project status changes, and comments are separate GitHub writes, so none of them alone provides an atomic issue claim.

## What Changes

- Document an agent work-claim lifecycle in `AGENTS.md` for discovery, exclusive claims, branch/worktree isolation, PR handoff, completion, and stale-claim recovery.
- Use creation of a unique remote lock ref as the atomic claim arbitration point. Treat labels, the project status, and issue comments as visible mirrors; never begin implementation when lock creation fails or cannot be verified.
- Define safe 12-hour recovery using an owner-specific lock commit and compare-and-delete, then require the reclaiming agent to win a new atomic ref creation.
- Prepare post-v0.2.1 roadmap epics and child issues for core vision, editor/export, Telegram static sticker output, agent governance, batch input, browser experiences, and optional inference. Link issues as parent/sub-issues in the existing GitHub Project and record relative complexity.
- Keep Telegram export static and local: meet Telegram's documented image requirements and leave pack creation to Telegram's own editor or `@Stickers`. Do not upload user images or claim that Telegram accepts Rusticker's ZIP as an importable pack.
- Make WhatsApp pack title/author implementation conditional on identifying a real importer contract; do not add unsupported metadata to the current archive format.
- Update issue labels and board status only after confirming which existing project, labels, and single-select options are available.

## Proposed Issue Inventory

The existing project contains six parent epics and 23 child issues. These are planning scopes, not a promise that every experiment will ship in the next release. The `Priority` field orders execution urgency (`P0` through `P3`); the `Complexity` field estimates relative effort (`S`, `M`, `L`, `XL`) independently. The immediate order is P0 technical documentation review (#56), then P1 theme colors (#44). Keep the release branch gated on the repository's end-to-end release-readiness rule.

### Existing roadmap issues

| Epic | Child issue | Initial priority | Acceptance criteria and dependency |
|---|---|---|---|
| Improve connected-sticker separation and edge quality | Evaluate watershed separation for touching stickers | P1 | Add deterministic synthetic fixtures and compare distance-transform/watershed seeds against current 8-connected behavior. Record false splits, missed splits, and a go/no-go decision before implementation. No private sample images. |
| Improve connected-sticker separation and edge quality | Split touching stickers with watershed | P1 | Depends on the evaluation issue's go decision. Update OpenSpec first; preserve current results for separated stickers and verify deterministic output, holes, noise, and ambiguous joins. |
| Improve connected-sticker separation and edge quality | Reduce color halos at sticker edges | P2 | Add edge fixtures and demonstrate reduced background-color spill while preserving opaque interiors and useful antialiasing; compare with current smoothing behavior. |
| Customize WhatsApp pack metadata | Verify title and author support in named WhatsApp importers | P1 | Identify reproducible, named importer versions and test a locally generated archive. Document whether title/author are recognized and the accepted file contract; do not change export format in this research issue. |
| Customize WhatsApp pack metadata | Add supported pack title and author metadata | P2 | Depends on verified importer support. Add localized fields and tested serialization only for a documented contract; if no supported contract is found, close as not planned with evidence and retain the current archive format. |
| Edit sticker order and boundaries | Reorder stickers in the editor | P2 | Provide pointer drag-and-drop and a keyboard alternative; verify preview and archive order match and persist through supported editor state changes. |
| Edit sticker order and boundaries | Adjust sticker bounds manually | P2 | Let users adjust a sticker crop with an accessible control; verify preview and exported transparency use the adjusted bounds and reject invalid/empty bounds safely. |
| Edit sticker order and boundaries | Erase and restore pixels with a brush | P2 | Add local alpha erase/restore controls with zoom, undo, and reset; verify bounds, preview, and export, and ensure image data stays on-device. |
| Export static sticker files for Telegram workflows | Export Telegram-compatible static sticker images | P2 | Produce transparent PNG/WEBP files with one dimension exactly 512 px and the other at most 512 px, using locale-neutral names. Explain that users continue in Telegram's editor or `@Stickers`; do not claim the ZIP imports as a native set or upload images. |
| Coordinate parallel agent work with atomic issue claims | Document and verify the issue-claim lifecycle | P0 | Update `AGENTS.md`; verify non-forced remote lock creation has a single winner, project/issue metadata mirrors the claim, PR completion clears it, and stale recovery cannot delete a changed lock. Document any GitHub permission/setup prerequisite. |

### Immediate priority sequence

| Priority | Issue | Acceptance criteria and sequence |
|---|---|---|
| P0 | [#56 Audit implementation and strengthen technical documentation](https://github.com/LucasReSilva/Rusticker/issues/56) | Review the implemented Rust/core, WASM/worker, frontend, and export flow; support technical claims with relevant research and primary references; add accurate Mermaid diagrams; document privacy boundaries; make no unplanned behavior changes. Complete first. |
| P1 | [#44 Rust orange and WhatsApp green palette](https://github.com/LucasReSilva/Rusticker/issues/44) | Update semantic light/dark theme tokens, preserving contrast, focus states, and design-system usage. Schedule immediately after #56. |

### Other added post-release requests, ordered by relative complexity

| Complexity | Issue | Acceptance criteria and dependency |
|---|---|---|
| S | [#47 Completion notifications](https://github.com/LucasReSilva/Rusticker/issues/47) | Request permission only after user action; provide localized fallback, opt-out, and local-only completion events. |
| M | [#46 Automatic and Advanced modes](https://github.com/LucasReSilva/Rusticker/issues/46) | Automatic mode applies documented defaults; Advanced exposes supported controls while preserving image/results and accessibility. |
| M | [#48 Privacy-first local history design](https://github.com/LucasReSilva/Rusticker/issues/48) | Decide between local hash lookup and browsable history; specify opt-in, retention, deletion, quota, and whether image blobs persist. |
| M | [#50 WebMCP feasibility and safe actions](https://github.com/LucasReSilva/Rusticker/issues/50) | Evaluate draft, browser support, permissions, threat model, and a minimal safe surface; expose no image pixels, files, or hashes. |
| M | [#52 Diagnose transparent/non-green split failures](https://github.com/LucasReSilva/Rusticker/issues/52) | Reproduce with synthetic alpha/background fixtures and define supported behavior in OpenSpec before detector changes. |
| L | [#45 Batch image input](https://github.com/LucasReSilva/Rusticker/issues/45) | Process multiple images with per-image status, retry/remove, bounded memory, cancellation, and local-only handling. |
| L | [#49 Local processing history](https://github.com/LucasReSilva/Rusticker/issues/49) | Blocked by #48; implement approved local-only history with deletion and storage-quota handling. |
| L | [#51 WebMCP workflows](https://github.com/LucasReSilva/Rusticker/issues/51) | Blocked by #50; feature-detect and expose reviewed actions with visible state and user confirmation for consequential actions. |
| L | [#53 Transparent/non-green split support](https://github.com/LucasReSilva/Rusticker/issues/53) | Blocked by #52; support documented alpha/background cases with deterministic tests while preserving chroma-key behavior. |
| L | [#54 ONNX model/runtime evaluation](https://github.com/LucasReSilva/Rusticker/issues/54) | Prefer a Rust/WASM ONNX runtime. Compare candidate model quality and license, Rust/WASM runtime and operator support, browser compatibility, model size, latency, memory, offline behavior, and fallback costs using synthetic fixtures. Evaluate a JavaScript runtime only if Rust/WASM cannot meet the requirements, and document why. |
| XL | [#55 Opt-in ONNX second-stage assistance](https://github.com/LucasReSilva/Rusticker/issues/55) | Blocked by #54; keep current processing first, load/run ONNX only on explicit request through the preferred Rust/WASM path, stay on-device, and preserve reviewable original results. |

Research and diagnosis issues are gates, not implementation commitments. In particular, #49 depends on the history design, #51 on WebMCP evaluation, #53 on background-failure diagnosis, and #55 on ONNX evaluation. The board's complexity sizes are relative estimates, not schedules. Add native GitHub issue dependencies where supported; otherwise keep the dependency explicit in both descriptions. Do not assign a release milestone until maintainers confirm the scope is functionally complete.

Priority and complexity are separate: **P0 first** — #56 (documentation/code audit), followed immediately by **P1** — #44 (theme colors). Remaining items can be sequenced by dependency and relative complexity. Across the roadmap, complexity is: **S** — #44, #47; **M** — #32, #34–#37, #40, #46, #48, #50, #52, #56; **L** — #33, #38, #41, #45, #49, #51, #53, #54; **XL** — #39, #55. Complexity is not priority or a promised schedule; dependencies and release readiness still govern execution.

Out of scope: implementing any detection, editing, metadata, or export feature; changing release automation; uploading images or archives; and silently creating a replacement GitHub Project if the existing board cannot be accessed.

## Capabilities

### New Capabilities

- `agent-work-coordination`: exclusive issue claims, isolated feature work, review handoff, completion, and stale-claim recovery for parallel coding agents.

### Modified Capabilities

None. Product behavior and its current capability specifications do not change in this governance proposal.

## Impact

- Repository docs: `AGENTS.md`.
- OpenSpec: one new `agent-work-coordination` capability spec.
- GitHub: repository labels and 29 issues (six epics and 23 children), plus items in the existing project. The project has `Todo`, `In Progress`, `In Review`, and `Done` statuses, a `Priority` field (`P0`–`P3`), and relative `Complexity` (`S`, `M`, `L`, `XL`); issues remain the detailed scope and acceptance criteria.
- No Rust, WebAssembly, frontend, dependency, or release workflow changes.
