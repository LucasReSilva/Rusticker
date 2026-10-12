## Context

See `proposal.md` - the core constraint is that project fields, labels, assignees, and issue comments are separate GitHub writes. The existing README and archived `whatsapp-export` contract also rule out silently asserting that WhatsApp reads a standalone title/author manifest. Telegram's official sticker documentation lists static PNG/WEBP image requirements and user paths through Telegram's editor or `@Stickers`; it does not specify a general-purpose ZIP pack format. Rusticker must remain local-only.

## Goals / Non-Goals

**Goals:** make one remote operation decide the winner of an issue claim; keep the project's issue status useful for human triage; let active agents make observable progress; make stale-lock recovery resistant to deleting a newer claim; group roadmap issues by parent epic; keep feature acceptance criteria independently implementable.

**Non-Goals:** building a GitHub App or bot, automatically editing labels/status from CI, implementing the roadmap features, sending sticker files to either platform, promising direct WhatsApp/Telegram pack import, or changing release automation.

## Decisions

### Use a remote ref creation as the claim arbitration point

After checking the existing project item is open and `Todo`, an agent creates `refs/heads/agent-locks/issue-<ID>` with a unique, empty claim commit whose parent is the current `develop` head. The claim commit message records the agent and a random claim nonce and includes the required co-author trailer. Pushing a new remote ref without force is the compare-and-set: exactly one concurrent creation can succeed. A rejected push, unavailable branch permission, or uncertain result is fail-closed. A losing agent changes no issue metadata and starts no feature work. The nonce also identifies the feature branch (`feature/issue-<ID>-<slug>-<claim>`), so a reclaimed worker cannot reuse the new owner's branch name.

Only after winning the lock does an agent create and push its nonce-scoped feature branch from the recorded develop base. If work runs in parallel locally, it gets its own Git worktree. Keeping the lock commit and feature commit separate makes progress measurable and avoids merging lock metadata into product code.

### Treat GitHub project metadata as a human-facing mirror

After the remote ref is confirmed, the winner adds `agent:claimed`, assigns the issue to its agent identity when possible, moves the existing project item to `In Progress`, and posts the specified claim comment with its nonce-scoped branch. Assignment is best-effort; the project status and claim comment are required mirrors. These writes are not described as atomic. If a required status cannot be set or the claim comment cannot identify the winner, the agent conditionally removes its own lock with an expected ref SHA and stops before editing source. Never create a substitute project or silently fall back to a label-only lock. If the board lacks an exact usable status, stop and document the schema change needed rather than silently changing existing fields or creating issues with an ambiguous state.

Before every issue or project metadata mutation, creating a source commit, pushing feature work, opening a PR, changing a lock heartbeat, or releasing a lock, an agent checks that the lock still points to its exact owned commit. Feature branches and pull requests stay uniquely attributable to one claim; a reclaimer does not reuse another agent's local worktree. Since GitHub does not make project-field writes conditional on a ref SHA, this is a cooperative fencing rule; the unique branch and pull-request nonce make stale writes detectable.

### Fence stale recovery with the claim commit SHA

A lock is eligible for recovery only if the issue is open, has no active PR, and the latest server-timestamped GitHub push event for the lock/feature refs or PR update is more than 12 hours old. Do not infer push time from a developer-controlled Git commit timestamp. If the relevant event history is unavailable or ambiguous, fail closed and ask a maintainer. Issue comments and status changes alone do not reset this timer. The reclaimer reads the exact lock ref SHA and deletes it with `git push --force-with-lease=<lock-ref>:<expected-SHA> origin :<lock-ref>`; first verify that the repository permits this operation. The claim commit includes a random nonce, so a lock recreated for the same issue has a different SHA. The reclaimer then competes to create a fresh claim commit; if another agent wins, it stops. Owners verify their claim immediately before every publication so an expired worker does not intentionally hand off a stale issue.

### Make project setup inspect-first

Use the repository owner's existing project, verify it is linked to `LucasReSilva/Rusticker`, inspect its status field and options, and add issues as native sub-issues of epic parents. Create only missing labels (`epic`, `roadmap`, `agent:claimed`) and only add a project status option if it is genuinely absent and project administration is authorized. The proposal contains five parent epics, ten children, priorities, acceptance criteria, and explicit research gates. Do not create issues until the board can represent `Todo`, `In Progress`, `In Review`, and `Done`; preserve existing options and stop if no unambiguous status mapping is available. All open issues start in `Todo`; the agent protocol controls later transitions. GitHub Project writes require a valid token with the `project` scope.

### Refine platform exports around verified contracts

Telegram's first export issue covers static image files only: preserve transparency, produce Telegram-compatible PNG/WEBP dimensions (one side exactly 512 pixels; the other no more than 512), and give the user localized steps to continue in Telegram's own editor or `@Stickers`. Do not add Telegram API calls or claim that Rusticker's ZIP creates a Telegram sticker set.

Keep WhatsApp metadata as a research-gated pair of issues. First identify and test a named importer that can read title and author from a generated local archive. Implement metadata UI/serialization only if this establishes a stable format; otherwise record the incompatibility and stop before changing the current archive contract. The previous export proposal explicitly excludes unverified `author.txt` and `contents.json` files.

## Risks / Trade-offs

- [Repository rules reject creation of `agent-locks/*` branches] â†’ Test branch creation during protocol setup; agents fail closed and request a maintainer to adjust branch rules rather than degrading to non-atomic labels.
- [GitHub push-event history is unavailable for the stale window] â†’ Require owners to push an issue-scoped checkpoint well inside the limit, check ownership before publishing, and limit stale recovery to exact-SHA compare-and-delete.
- [An agent loses ownership before a mirror write] â†’ Revalidate the lock before every mirror mutation and make nonce-mismatched metadata visible for the current owner to reconcile.
- [WhatsApp importer formats differ] â†’ Gate title/author implementation on a tested named importer and preserve the existing archive until then.
- [A Telegram ZIP is mistaken for a native sticker set] â†’ Call it a static sticker-file export and describe the explicit in-app/@Stickers step in every locale.

## Migration Plan

First enable and review the new agent-claim protocol on `develop`. Create parent epics and child issues in the existing GitHub Project with status `Todo`. Agents adopt the protocol issue by issue. No production migration or release action is required.
