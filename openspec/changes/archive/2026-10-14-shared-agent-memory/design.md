## Context

See proposal.md for motivation. The repository may be opened through linked worktrees, while separate clones have independent Git common directories. The memory must remain on the developer's machine and outside normal version control.

## Goals / Non-Goals

**Goals:** Provide a discoverable canonical file for handovers across linked worktrees, with privacy and staleness rules.

**Non-Goals:** Automatically synchronize separate clones or machines, arbitrate issue ownership, or integrate with provider-specific memory databases.

## Decisions

- Store the canonical file at `.agents/memory.local.md` in the main worktree associated with the Git common directory. Agents can discover it by resolving the Git common directory and inspecting `git worktree list --porcelain`; this avoids divergent copies in linked worktrees.
- Ignore the root-anchored path `/.agents/memory.local.md`. The path remains explicit and easy to check with Git while leaving tracked skills under `.agents/` unaffected.
- Keep the format plain Markdown with a small documented structure (schema version, update time, agent, active work mappings, handovers, sources/validity). Markdown is readable by all providers without new dependencies.
- Use the orchestrating agent as the single writer for a session. Delegated agents send proposed notes to it, avoiding concurrent writes and merge-like conflicts.
- Treat memory as advisory, potentially stale context. GitHub state and remote refs remain authoritative. Do not include secrets, user content, raw transcripts, private archives, or image-derived data.

Alternatives considered: one memory file per worktree would fragment handovers; a file in a user profile would not travel with the repository context and would need provider-specific discovery; a server or Git synchronization would publish machine-local state and add privacy and access concerns.

## Risks / Trade-offs

- A main-worktree path may be unavailable if that worktree was moved or deleted → derive it at startup and continue normally when absent.
- Local notes can become stale → store timestamps and sources, verify time-sensitive claims, and supersede outdated entries.
- Git ignore can be bypassed deliberately → document that agents must never force-add or publish the memory file.
- Multiple agents may try to edit simultaneously → designate one coordinating writer per session.

## Migration Plan

Add the ignore rule and protocol documentation. The local file is optional; agents create it only when useful. Rollback consists of removing the documentation, ignore rule, and local file; no tracked user or application data is migrated.
