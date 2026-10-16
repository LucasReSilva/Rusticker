## Purpose

Provides narrowly scoped, privacy-preserving browser-agent actions while keeping the human-operated editor as the primary workflow.

## Requirements

### Requirement: Optional and isolated WebMCP registration

The application SHALL feature-detect the experimental WebMCP API and register tools only when `document.modelContext.registerTool` is available. API absence or registration failure SHALL NOT prevent or alter the normal human-operated editor flow. Registration SHALL be cleaned up when the integration component is removed.

#### Scenario: Browser does not expose WebMCP

- **WHEN** the tool integration is mounted in a browser without `document.modelContext.registerTool`
- **THEN** it registers no tools and leaves the regular editor available

#### Scenario: Registration is disposed

- **WHEN** the tool integration is removed or its localized metadata changes
- **THEN** it aborts its registration signal so previously registered tools are removed

### Requirement: Minimal, privacy-preserving tools

The application SHALL expose only `open-image-picker` and read-only `get-editor-status` through this integration. Both tools SHALL accept an empty object only and SHALL reject extra or malformed input. The picker tool SHALL call the existing picker action and return only a fixed result. The status tool SHALL return only one of `empty`, `image-loaded`, `reviewing-results`, or `ready-to-export`.

The tools SHALL NOT accept, return, or otherwise expose file bytes, pixels, blobs, file names, hashes, sticker crops, counts, dimensions, settings, image-derived metadata, or generated archives. They SHALL NOT expose detection, editing, deletion, or export actions.

#### Scenario: Agent requests picker

- **WHEN** `open-image-picker` receives an empty object
- **THEN** it invokes the existing picker callback and returns only the fixed `picker-opened` or `picker-unavailable` result

#### Scenario: Picker call is cancelled

- **WHEN** the picker tool is cancelled before the callback runs
- **THEN** it skips the callback and returns the fixed `picker-unavailable` result

#### Scenario: Agent queries editor status

- **WHEN** `get-editor-status` receives an empty object
- **THEN** it returns only one permitted coarse workflow state and marks the tool read-only

#### Scenario: Agent supplies extra fields

- **WHEN** either tool receives a non-empty object, array, or non-object input
- **THEN** the integration rejects the call before invoking an editor callback

#### Scenario: Editor status is invalid or unavailable

- **WHEN** the status callback returns a value outside the permitted enum or cannot provide a status
- **THEN** the tool returns a fixed generic failure without including the invalid value or exception text

### Requirement: Human interface remains authoritative

Tool actions SHALL use the same application callbacks as the human interface. WebMCP availability SHALL remain an optional progressive enhancement, and the visible picker SHALL remain available when browser activation policy prevents an agent-initiated picker request.

#### Scenario: Browser blocks opening the picker

- **WHEN** the existing picker callback reports that opening the picker was unavailable
- **THEN** the tool returns the fixed `picker-unavailable` result and the visible picker remains available

#### Scenario: WebMCP is unavailable or fails

- **WHEN** WebMCP is absent or tool registration fails
- **THEN** the normal upload, detection, review, and export flow remains unchanged
