## Why

Rusticker's v0.2.1 release leaves several independently valuable improvements, but parallel implementation can duplicate work or collide in shared code. Labels, project status changes, and comments are separate GitHub writes, so none of them alone provides an atomic issue claim.

## What Changes

- Document an agent work-claim lifecycle in `AGENTS.md` for discovery, exclusive claims, branch/worktree isolation, PR handoff, completion, and stale-claim recovery.
- Use creation of a unique remote lock ref as the atomic claim arbitration point. Treat labels, the project status, and issue comments as visible mirrors; never begin implementation when lock creation fails or cannot be verified.
- Define safe 12-hour recovery using an owner-specific lock commit and compare-and-delete, then require the reclaiming agent to win a new atomic ref creation.
- Prepare post-v0.2.1 roadmap epics and child issues for core vision, editor/export, Telegram static sticker output, and agent governance. Link issues as parent/sub-issues in the existing GitHub Project after inspecting its fields and obtaining the required authorization.
- Keep Telegram export static and local: meet Telegram's documented image requirements and leave pack creation to Telegram's own editor or `@Stickers`. Do not upload user images or claim that Telegram accepts Rusticker's ZIP as an importable pack.
- Make WhatsApp pack title/author implementation conditional on identifying a real importer contract; do not add unsupported metadata to the current archive format.
- Update issue labels and board status only after confirming which existing project, labels, and single-select options are available.

## Proposed Issue Inventory

Create five parent epics and ten child issues in the existing project. These are planning scopes, not a promise that every experiment will ship in the next release. Keep the release branch gated on the repository's end-to-end release-readiness rule.

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

The two research issues are gates, not implementation commitments. Order governance setup first, then the watershed and WhatsApp research spikes; independent editor, edge-quality, and Telegram work can be prioritized after the project board is inspected. Add native GitHub issue dependencies where supported; otherwise keep the dependency explicit in both descriptions. Do not assign a release milestone until maintainers confirm the scope is functionally complete.

Out of scope: implementing any detection, editing, metadata, or export feature; changing release automation; uploading images or archives; and silently creating a replacement GitHub Project if the existing board cannot be accessed.

## Capabilities

### New Capabilities

- `agent-work-coordination`: exclusive issue claims, isolated feature work, review handoff, completion, and stale-claim recovery for parallel coding agents.

### Modified Capabilities

None. Product behavior and its current capability specifications do not change in this governance proposal.

## Impact

- Repository docs: `AGENTS.md`.
- OpenSpec: one new `agent-work-coordination` capability spec.
- GitHub: repository labels and issues, plus items and status values on the existing project after its identity and schema are verified. The project remains the execution queue; issues remain the detailed scope and acceptance criteria.
- No Rust, WebAssembly, frontend, dependency, or release workflow changes.
