## Why

Agents currently keep handover notes in provider-specific locations, so another agent or worktree may miss active context and repeat investigation. A repository-defined, machine-local protocol provides continuity without publishing machine state.

## What Changes

- Define a shared local memory file and a protocol for agents to discover, read, update, and expire its notes across linked worktrees.
- Ignore the memory file in Git and document strict privacy rules for its contents.
- Document that GitHub issues and atomic claim refs remain authoritative for ownership and progress.
- Out of scope: syncing memory to a server, storing user images or credentials, and replacing GitHub issue tracking.
- This change does not touch `core/` or `web/`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `agent-work-coordination`: Add requirements for shared memory discovery, safe content, and staleness handling.

## Impact

Updates `AGENTS.md`, `.gitignore`, and the existing `agent-work-coordination` OpenSpec contract. Adds a local-only `.agents/memory.local.md` convention; no application code, network service, or dependency changes.
