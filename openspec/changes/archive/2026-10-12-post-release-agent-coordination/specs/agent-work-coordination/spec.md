## Purpose

Defines how parallel coding agents discover, exclusively claim, implement, hand off, and release repository issues without beginning work on a claim another agent won.

## ADDED Requirements

### Requirement: Agents verify access before claiming work
Before claiming an issue, an agent SHALL verify that it is authenticated as the intended repository owner and can read the repository, create the remote claim and feature refs, and access the existing GitHub Project fields required by the workflow. If any required permission or API capability is unavailable, the agent SHALL stop before changing issue/project metadata or implementation files. Credentials SHALL NOT be printed or committed.

#### Scenario: Required access is unavailable
- **WHEN** the agent cannot verify repository write access, remote ref creation, or required Project access
- **THEN** it stops without claiming through labels, assignments, status changes, or comments
