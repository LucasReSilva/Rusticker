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

- [x] 3.1 Race two create-only pushes to one disposable remote test ref; verify exactly one succeeds, the other fails, and neither command uses force. Do not use a real issue lock.
- [x] 3.2 Verify by read-only audit that the protocol orders all issue/project metadata writes after ownership confirmation and requires exact-SHA ownership checks before each write; no issue or project metadata is changed by this test.
- [x] 3.3 Verify the documented branch and worktree names include the claim nonce and start from `develop`; inspect the protocol's ownership fence before commits and PRs. Do not publish a feature branch or PR for the disposable test.
- [x] 3.4 Review the documented PR handoff and completion requirements; do not open/merge a synthetic PR or mutate a real issue to test it.

## 4. Stale-claim recovery

- [x] 4.1 Verify the stale-recovery rule uses server-timestamped GitHub events, checks issue and PR state, and compare-deletes only the inspected lock SHA. A real 12-hour-old lifecycle cannot be safely fabricated in this repository test.
- [x] 4.2 Verify the documented fail-closed conditions for newer progress, active PRs, closed issues, changed SHAs, and competing claims. Do not alter any real claim ref; synthetic exact-SHA fencing is covered by the disposable-ref test record.

## 5. Roadmap quality and tracking

- [x] 5.1 Review all six parent epic descriptions and 23 child acceptance criteria for explicit dependencies, locale/privacy constraints, and independent completion.
- [x] 5.2 Keep WhatsApp metadata implementation gated on a tested named importer; keep Telegram scope to compliant static sticker files and user-controlled Telegram import, with no API upload.
- [x] 5.3 Verify the existing board shows all parent/sub-issue relationships, `Todo` statuses, `P0`–`P3` priorities, and `S`/`M`/`L`/`XL` complexity values; confirm all issue links resolve and no user image or private sample has been uploaded.
- [x] 5.4 Add the requested feature areas with relative complexity ordering and explicit research/diagnosis gates for WebMCP, ONNX, local history, and background handling.
- [x] 5.5 Add documentation/code audit issue #56 as P0, place palette issue #44 at P1 immediately afterward, and add Priority tracking to the existing project.
