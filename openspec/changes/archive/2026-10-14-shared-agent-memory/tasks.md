## 1. Implement the shared memory protocol

- [x] 1.1 Add a root-anchored ignore rule for `.agents/memory.local.md` and verify it with `git check-ignore -v .agents/memory.local.md`
- [x] 1.2 Document canonical path discovery across linked worktrees, expected Markdown fields, privacy limits, staleness, and the single-writer rule in `AGENTS.md`; verify the main worktree is found from `git worktree list --porcelain`
- [x] 1.3 Verify Git reports the canonical local memory path as ignored and ordinary `git status --short` does not list it; do not add private memory content to tracked artifacts

## 2. Validate the change

- [x] 2.1 Run `bunx --no-install openspec validate shared-agent-memory --strict` and resolve all validation errors
- [x] 2.2 Run `git diff --check` and review the scoped diff for privacy and consistency with the coordination spec
