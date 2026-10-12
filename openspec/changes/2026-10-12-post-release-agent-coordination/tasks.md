## 1. Issue and project discovery

- [x] 1.1 Inspect `LucasReSilva`'s existing projects and identify the board linked to `LucasReSilva/Rusticker`; verify its `Status` field and options include or can represent `Todo`, `In Progress`, `In Review`, and `Done` without changing existing cards.
- [x] 1.2 Compare all repository issues and the board items against the six-epic, 23-child inventory; create only missing issues and link them as native sub-issues to their epic parents.
- [x] 1.3 Ensure only missing labels from `epic`, `roadmap`, and `agent:claimed` are created; confirm every new issue is open, has applicable labels, and appears in the existing project in `Todo`.

## 2. Agent protocol documentation

- [x] 2.1 Update `AGENTS.md` with candidate discovery, the remote lock-ref claim, visible project metadata, branch/worktree isolation, OpenSpec, PR handoff, completion, and privacy rules; verify every step has a clear failure path.
- [x] 2.2 Document that the project status, label, assignment, and comment are mirrors, not locks, and that agents must fail closed when atomic remote claim creation cannot be verified.
- [x] 2.3 Document the 12-hour stale rule and exact-SHA compare-and-delete recovery, including checks for an open issue, an existing PR, changed locks, and competing re-claimers.
- [x] 2.4 Verify the documentation commit preserves Lucas as primary author and includes `Co-authored-by: Codex <noreply@openai.com>`; run `openspec validate post-release-agent-coordination --strict`.

## 3. Atomic-claim verification

- [ ] 3.1 From two disposable local clones or worktrees, concurrently try creating the same absent issue lock ref; verify one succeeds, the loser changes no issue/project metadata, and neither uses force.
- [ ] 3.2 Verify claim metadata is published only by the winner, project status moves to `In Progress`, and a required project update failure conditionally releases only the winner's exact ref before code changes.
- [ ] 3.3 Verify the winner creates the prescribed feature branch from `develop`, publishes a progress checkpoint before 12 hours, and cannot publish a source commit or PR after its claim ref has changed.
- [ ] 3.4 Verify PR creation moves the issue to `In Review`, `Closes #<ID>` closes it on merge, the item reaches `Done`, and only the exact completed claim ref is deleted.

## 4. Stale-claim recovery

- [ ] 4.1 Test that an open issue with no pushed feature commit or PR update for more than 12 hours and no active PR may be reclaimed using compare-and-delete with the inspected ref SHA.
- [ ] 4.2 Test that a newer progress commit, active PR, closed issue, changed lock SHA, or another agent's successful new claim prevents recovery from deleting that claim.

## 5. Roadmap quality and tracking

- [x] 5.1 Review all six parent epic descriptions and 23 child acceptance criteria for explicit dependencies, locale/privacy constraints, and independent completion.
- [x] 5.2 Keep WhatsApp metadata implementation gated on a tested named importer; keep Telegram scope to compliant static sticker files and user-controlled Telegram import, with no API upload.
- [x] 5.3 Verify the existing board shows all parent/sub-issue relationships, `Todo` statuses, `P0`–`P3` priorities, and `S`/`M`/`L`/`XL` complexity values; confirm all issue links resolve and no user image or private sample has been uploaded.
- [x] 5.4 Add the requested feature areas with relative complexity ordering and explicit research/diagnosis gates for WebMCP, ONNX, local history, and background handling.
- [x] 5.5 Add documentation/code audit issue #56 as P0, place palette issue #44 at P1 immediately afterward, and add Priority tracking to the existing project.
