# AGENTS.md

Instructions for AI coding agents (and humans) working in this repository.
Read this file before making any change.

## Project in one paragraph

Rusticker is a fully client-side web app that takes one image containing many
stickers on a uniform background (e.g. chroma-key green), detects each sticker,
removes the background, and exports a WhatsApp-ready sticker pack. Image
processing runs in Rust compiled to WebAssembly inside a Web Worker; the UI is
SvelteKit (static, no server). **User images never leave the browser.**

## Language policy

- **Everything in the repository is English**: identifiers, file and directory
  names, code comments, documentation, commit messages, branch names, and
  OpenSpec artifacts (proposals, specs, designs, tasks).
  - Use `Sticker`, `detect`, `Grid.svelte` — never `Figurinha`, `detectar`,
    `Grade.svelte`.
- **End-user text is the only exception**, and it lives exclusively in the
  localized message catalogs (`web/messages/<locale>.json`, Paraglide). Never
  hardcode user-visible strings in components — including design-system
  components, `aria-label`s, `alt` text, page titles, and meta descriptions.
- **Talk to the developer in their language.** Reply in whatever language the
  developer writes to you (e.g. Portuguese in, Portuguese out), while every
  file, commit, or spec you produce stays in English.

## Tooling rules

- **Shell preference:** agents should prefer Git Bash for terminal commands
  on Windows. Use PowerShell when Git Bash is unavailable or a task requires
  Windows-specific commands.
- **Bun only** for JavaScript: `bun install`, `bun run <script>`, `bunx <bin>`.
  Never use `npm`, `npx`, `pnpm`, or `yarn`. Commit `bun.lock`.
- **Rust**: the toolchain is pinned in `rust-toolchain.toml`. Code must pass
  `cargo fmt` and `cargo clippy -- -D warnings`.
- **WebAssembly**: after any change in `core/`, rebuild and reinstall —
  `wasm-pack build core --target web`, then `bun install` in `web/` (the local
  `file:../core/pkg` dependency is copied, not linked). The `build:wasm` script
  does both.
- **Git hooks** are managed with [prek](https://github.com/j178/prek) (a
  drop-in for pre-commit; same `.pre-commit-config.yaml`).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) are enforced by a
commit-msg hook. Use types such as `feat`, `fix`, `docs`, `chore`, `refactor`,
`test`, `ci`, `build`, `perf`, with an optional scope (`core`, `web`, `i18n`,
`ui`, `openspec`):

```text
feat(core): detect stickers with 8-connected components
fix(web): keep locale prefix when switching theme
```

- Every commit created by an AI agent must include a `Co-authored-by` trailer
  identifying the agent that contributed to it. Keep the developer as the
  primary author and preserve existing co-author trailers. For Codex, use:

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  ```

## Branching: Gitflow

- `main` holds released code only (each push deploys); `develop` is the
  integration branch. Never commit directly to either.
- Implement each OpenSpec change on `feature/<change-name>`, created from
  `develop` (one git worktree per feature when working in parallel), and merge
  back into `develop` through a pull request.
- Releases go through `release/<x.y.z>` (from `develop`, merged into `main`
  with a `vX.Y.Z` tag and back into `develop`); urgent fixes through
  `hotfix/<x.y.z>` from `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

- **Release readiness:** do not create or publish a release until the app can
  load an image, detect and curate stickers, and download a valid sticker pack
  end to end. Verify that functional flow before starting a release branch.

## Workflow: OpenSpec

Non-trivial work goes through [OpenSpec](https://github.com/Fission-AI/OpenSpec):

1. Explore (`/opsx:explore`) → propose a change (`/opsx:propose`), which
   creates `openspec/changes/<name>/` with proposal, specs, design, and tasks.
2. Implement it (`/opsx:apply <name>`), checking off tasks as they are verified.
3. Archive it (`/opsx:archive <name>`), merging its specs into `openspec/specs/`.

`openspec/specs/` is the source of truth for current behavior. Do not
implement behavior that contradicts a spec without changing the spec first.

## Multi-agent issue lifecycle

Before using the GitHub Project, verify that GitHub CLI is authenticated as the
intended repository owner and can read the repository, create remote refs, and
read and update the existing project. Project operations require the account or
token to have project access; repository operations require write access to
the repository and permission to create the claim and feature branches. Check
the authenticated account and effective access before starting. If a required
permission, project field, or API operation is unavailable, stop before any
issue/project mutation or implementation; do not substitute labels or comments
for a lock. Never print or commit authentication tokens.

When selecting work from the repository's existing GitHub Project, take only
an open issue in `Todo` with no active claim ref. Labels, assignees, comments,
and project fields are tracking mirrors; none is an exclusive lock.

Before changing issue metadata or source, atomically claim
`refs/heads/agent-locks/issue-<ID>` by creating and pushing that previously
absent remote ref without force. Use an empty claim commit based on the current
`develop` head, with the agent identity, a unique nonce, and the required
`Co-authored-by` trailer. Exactly one create-only push may win. If the push is
rejected, ambiguous, or branch creation is not permitted, stop; never fall back
to a label, assignment, project status, or comment as the lock.

After confirming ownership, use the nonce in a dedicated branch name such as
`feature/issue-<ID>-<slug>-<claim>` and create a separate worktree when working
in parallel. Then add `agent:claimed`, set the existing project item to
`In Progress`, and comment `🔒 Claimed by Agent <name> on branch
<branch> (claim <nonce>)`. Assignment is optional. Recheck ownership before
every issue/project update, commit, push, pull request, lock renewal, and lock
release. If a required status or claim comment cannot be published, conditionally
remove only your exact lock ref and stop before implementation.

Keep non-trivial work in OpenSpec. Push progress regularly and open a pull
request to `develop` with `Closes #<ID>`; move the project item to `In Review`
only after verifying ownership. Keep the lock until the issue closes on merge,
then set `Done` and remove only the exact completed lock ref. Do not attach or
upload user images, sticker pixels, generated private archives, credentials, or
other user data to GitHub.

After an issue is completed and its implementation is merged, recheck claim
ownership and post a final comment on the issue summarizing the delivered
behavior. Base the summary on the applicable OpenSpec artifacts and the code
that was merged; mention material validation results and known limitations.
Post this completion summary before releasing the exact claim ref.

A claim may be reclaimed only when the issue remains open, has no active pull
request, and GitHub's server-timestamped push-event history for the lock and
feature refs plus pull-request activity shows no progress for more than 12
hours. Git commit dates alone are not reliable. If event history is unavailable
or unclear, fail closed and ask a maintainer. Delete with an expected old lock
SHA, then compete to create a fresh lock without force. If the SHA changed, do
not delete it; do not reuse the previous owner's branch or worktree.

## Machine-local shared agent memory

Agents MAY use `.agents/memory.local.md` to pass concise operational context
and handovers across linked worktrees. It is optional: if absent or unavailable,
continue from the repository and issue state. For linked worktrees, resolve the
absolute Git common directory (`git rev-parse --path-format=absolute
--git-common-dir`) and inspect `git worktree list --porcelain`. The main worktree
is the entry whose `.git` file resolves to that common directory (rather than
the `.git` directory of a linked worktree); use
`<main-worktree>/.agents/memory.local.md` as the canonical file. Separate clones
have separate memory files.

Keep the file in Markdown with a schema version, UTC update time, agent identity,
active issue/branch/worktree mappings, and short handovers with sources or
validity notes. A coordinating agent is the sole writer for a session; delegated
agents send proposed updates to that coordinator instead of writing concurrently.
Verify time-sensitive notes against live sources and supersede stale entries.
GitHub issues, project fields, and atomic claim refs remain authoritative;
memory never creates ownership or replaces a claim.

The file is Git-ignored. Never force-add, commit, push, or attach it. Do not put
credentials, user images or sticker pixels, private archives, raw transcripts or
logs, or other sensitive user data in it. Keep only the minimum operational
context needed for handover; the developer may delete the file at any time.

## Hard rules (architecture)

- The Rust core **never returns user-facing text**. Errors and warnings are
  codes/enums (`NoStickers`, `ImageTooLarge`, …); the frontend translates them.
- The UI uses **only design-system components and theme tokens** — no raw hex
  colors, magic pixel values, or ad-hoc radii. Use Tailwind logical utilities
  (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`), never `ml/mr/pl/pr/left/right`.
- Output file names are locale-neutral (`rusticker-pack-1.zip`, `sticker_01.webp`).
- No network calls with user data. Ever.

## Where to find things

| Topic                                              | Document                               |
|----------------------------------------------------|----------------------------------------|
| What the product is, commands, roadmap             | [README.md](README.md)                 |
| Layout, data flow, detection algorithm, Rust ↔ JS  | [ARCHITECTURE.md](ARCHITECTURE.md)     |
| Design system, tokens, accessibility, i18n         | [DESIGN.md](DESIGN.md)                 |
| Setup, hooks, adding a locale or a UI component    | [CONTRIBUTING.md](CONTRIBUTING.md)     |
| Privacy guarantees and vulnerability reporting     | [SECURITY.md](SECURITY.md)             |
| Current behavior contracts                         | [openspec/specs/](openspec/specs/)     |
