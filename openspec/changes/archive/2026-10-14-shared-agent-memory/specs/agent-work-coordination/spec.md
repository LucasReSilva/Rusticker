## MODIFIED Requirements

### Requirement: Implementation stays isolated and follows repository workflow
After a visible, verified claim, an agent SHALL implement on the dedicated issue feature branch from `develop`, using its own Git worktree when concurrent work is present. Non-trivial changes SHALL follow OpenSpec. AI-authored commits SHALL preserve the developer as primary author and include the repository's required co-author trailer. Before every issue or project metadata mutation, source commit, push, pull request, lock renewal, or release, an agent SHALL verify that it still owns the exact lock commit. Since GitHub project-field writes are not conditional on a ref SHA, this check is cooperative; the nonce-scoped branch and pull request make stale ownership detectable. Agents MAY consult and maintain the machine-local shared memory protocol when it is available; memory is advisory and SHALL NOT establish issue ownership or replace authoritative issue/project state.

#### Scenario: Parallel work uses isolated branches
- **WHEN** two agents implement different issues concurrently
- **THEN** each has a separate issue branch and, when working locally at the same time, a separate worktree based on `develop`

#### Scenario: OpenSpec applies
- **WHEN** an issue changes product behavior or has non-trivial technical scope
- **THEN** its implementation starts from reviewed OpenSpec proposal, spec, design, and task artifacts

#### Scenario: Memory is missing
- **WHEN** an agent cannot find a shared memory file
- **THEN** it continues using authoritative repository and issue state without treating the missing file as an error

## ADDED Requirements

### Requirement: Agents maintain private shared handover memory
Agents MAY use the repository-defined machine-local memory file to share concise operational context and handovers across linked worktrees when it is available. The file SHALL be excluded from normal Git tracking and SHALL NOT contain credentials, user images or pixels, private archives, raw transcripts, or other sensitive user data. Agents SHALL treat memory as potentially stale, verify time-sensitive facts against their authoritative sources, and use a single coordinating writer to avoid concurrent lost updates.

#### Scenario: A linked worktree reads shared context
- **WHEN** an agent chooses to use shared memory from a linked worktree in the same local repository
- **THEN** it locates and reads the canonical memory file associated with that repository's main worktree

#### Scenario: An agent records a handover
- **WHEN** an agent has reusable operational context or a handover for another agent
- **THEN** it records a concise note with an update time and source or validity context, without private user data

#### Scenario: Git excludes local memory
- **WHEN** the canonical memory file exists
- **THEN** Git reports it as ignored and ordinary status and commits do not include it

#### Scenario: Memory conflicts with live state
- **WHEN** a memory note conflicts with the current issue, project, remote ref, or repository state
- **THEN** the agent follows the authoritative live state and updates or supersedes the stale note
