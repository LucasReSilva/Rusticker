## Purpose

Defines how parallel coding agents discover, exclusively claim, implement, hand off, and release repository issues without beginning work on a claim another agent won.

## ADDED Requirements

### Requirement: Agents select eligible issues
An agent SHALL select only an open repository issue in the existing GitHub Project's `Todo` state that has no active claim ref. An issue's label, assignee, project status, or comment alone SHALL NOT establish exclusive ownership.

#### Scenario: Issue is ready
- **WHEN** an issue is open, in `Todo`, and has no active claim ref
- **THEN** an agent may attempt to claim it

#### Scenario: Issue is already claimed or in review
- **WHEN** an issue has an active claim ref, is in `In Progress` or `In Review`, or is closed
- **THEN** an agent does not start implementation on it

### Requirement: Claim acquisition is exclusive and atomic
Before changing source files, an agent SHALL create the issue's unique lock ref from the current `develop` head using an owner-specific claim commit and a non-forced remote ref creation. The claim commit SHALL contain a unique nonce. The remote server's successful creation of the previously absent ref is the sole atomic winner decision. If creation is rejected, its outcome is uncertain, or exclusive ownership cannot be verified, the agent SHALL stop without writing implementation code or changing issue metadata as if it were the owner.

#### Scenario: One of two agents wins
- **WHEN** two agents try to create the same absent issue lock ref concurrently
- **THEN** exactly one remote creation succeeds, and only that agent may proceed

#### Scenario: A competing claim exists
- **WHEN** creation is rejected because the issue lock ref already exists
- **THEN** the losing agent leaves the winning claim unchanged and selects another issue

#### Scenario: Lock infrastructure is unavailable
- **WHEN** the agent cannot create or verify a remote lock ref
- **THEN** it does not fall back to labels, assignees, project status, or comments as a lock

### Requirement: Claim metadata mirrors the lock
After winning the lock, an agent SHALL publish its nonce-scoped `feature/issue-<ID>-<slug>-<claim>` branch from `develop`, add the `agent:claimed` label, set the existing project item to `In Progress`, and comment with its agent identity, branch, and claim nonce. These fields are visible mirrors of the lock, not arbitration mechanisms. Assignment is optional; the project status and claim comment are required. If a required project status or claim comment cannot be updated, the agent SHALL release only its exact lock ref and stop before implementation. If the board cannot represent the required lifecycle states, agents SHALL stop and request an authorized schema change instead of creating issues with an ambiguous status.

#### Scenario: Successful claim is visible
- **WHEN** an agent wins the atomic claim
- **THEN** the feature branch, label, `In Progress` status, and claim comment identify the same issue and agent

#### Scenario: Project update fails
- **WHEN** the lock is acquired but the project item or claim metadata cannot be updated
- **THEN** the agent conditionally releases its lock and does not start implementation

### Requirement: Implementation stays isolated and follows repository workflow
After a visible, verified claim, an agent SHALL implement on the dedicated issue feature branch from `develop`, using its own Git worktree when concurrent work is present. Non-trivial changes SHALL follow OpenSpec. AI-authored commits SHALL preserve the developer as primary author and include the repository's required co-author trailer. Before every issue or project metadata mutation, source commit, push, pull request, lock renewal, or release, the agent SHALL verify that it still owns the exact lock commit. Since GitHub project-field writes are not conditional on a ref SHA, this check is cooperative; the nonce-scoped branch and pull request make stale ownership detectable.

#### Scenario: Parallel work uses isolated branches
- **WHEN** two agents implement different issues concurrently
- **THEN** each has a separate issue branch and, when working locally at the same time, a separate worktree based on `develop`

#### Scenario: OpenSpec applies
- **WHEN** an issue changes product behavior or has non-trivial technical scope
- **THEN** its implementation starts from reviewed OpenSpec proposal, spec, design, and task artifacts

### Requirement: Pull requests hand off and complete claims
A completed implementation SHALL be proposed as a pull request targeting `develop` and SHALL include `Closes #<ID>`. Before review, the project item SHALL move to `In Review`. The lock SHALL remain until merge closes the issue; after merge and closure, its exact lock ref SHALL be removed. The merged issue and project item SHALL be `Done`.

#### Scenario: Pull request enters review
- **WHEN** the implementation pull request is opened
- **THEN** it targets `develop`, references `Closes #<ID>`, and the project item is `In Review`

#### Scenario: Merged issue completes
- **WHEN** the pull request merges and GitHub closes the referenced issue
- **THEN** the project item is `Done` and the completed claim ref is removed

### Requirement: Stale claims are recovered with compare-and-swap
A claim MAY be reclaimed only when the issue is open, no active pull request exists, and GitHub server-timestamped push-event history for the lock/feature refs and pull-request activity shows no progress for more than 12 hours. An agent SHALL NOT infer push time from a developer-controlled commit timestamp. If event history is missing or ambiguous, it SHALL fail closed and ask a maintainer. A reclaimer SHALL delete the lock using the exact expected remote lock commit so a changed or replaced lock cannot be removed, then compete to create a new claim ref; only the successful creator proceeds. Issue comments or board-status edits alone SHALL NOT refresh the stale timer.

#### Scenario: Stale lock is safely reclaimed
- **WHEN** GitHub server-timestamped events show no push to the claim/feature refs or pull-request activity for more than 12 hours, and the issue is open with no active pull request
- **THEN** a reclaimer may compare-and-delete the exact old lock and must win a new atomic lock creation before changing implementation

#### Scenario: Claim is active or changed during recovery
- **WHEN** a progress commit or active pull request exists, or the lock ref no longer matches the inspected commit
- **THEN** recovery stops without deleting the active lock

### Requirement: Project tracking does not expose user data
Issue titles, descriptions, comments, commits, pull requests, branches, and project fields SHALL contain only product requirements, source references, agent identity, and progress. Agents SHALL never attach or upload user images, sticker pixels, generated private archives, access tokens, or other user data to GitHub.

#### Scenario: Claim and implementation are tracked without image data
- **WHEN** an agent creates an issue, claims it, or submits a pull request
- **THEN** GitHub receives no user image, sticker image, export archive, credential, or data derived from the user's private files
