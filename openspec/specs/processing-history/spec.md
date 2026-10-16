# processing-history Specification

## Purpose
Processing history lets a user review summaries of completed image-processing runs on the same device, without retaining image content or sending any user-derived information to a server.

## Requirements

### Requirement: Processing history is explicitly enabled
The application SHALL keep processing history disabled by default. Before the first history record is saved, the user SHALL explicitly enable history and be told that only a local processing summary and an optional exact-file fingerprint are retained. Disabling history SHALL prevent new records from being written and SHALL offer to clear existing records without clearing them automatically.

#### Scenario: History is off by default
- **WHEN** a user completes processing without enabling history
- **THEN** the application SHALL NOT persist a processing record or image fingerprint

#### Scenario: User enables history
- **WHEN** a user explicitly enables processing history
- **THEN** the application SHALL explain which summary fields are stored locally and that source and output pixels are not stored
- **AND** only subsequent completed runs may be recorded

#### Scenario: User disables history
- **WHEN** a user disables processing history
- **THEN** future runs SHALL NOT be recorded
- **AND** the application SHALL let the user choose whether to clear existing history

### Requirement: History stores a minimal local summary
For each completed run while history is enabled, the application SHALL store a local record containing a random record identifier, completion time, source image dimensions, processing options, and sticker count. It MAY store a SHA-256 fingerprint of the exact selected file bytes to recognize byte-identical files; the fingerprint SHALL remain local, SHALL NOT be shown to the user, and SHALL NOT be treated as anonymized data. The application SHALL NOT persist source image bytes, decoded pixels, sticker pixels, generated pack bytes, original file names, or file paths in history.

#### Scenario: Completed run is recorded
- **WHEN** processing completes and history is enabled
- **THEN** the application stores the allowed summary fields on the user's device
- **AND** it stores no source or generated image content

#### Scenario: Fingerprint is unavailable
- **WHEN** browser capabilities do not permit calculating SHA-256
- **THEN** the application may store the summary without a fingerprint
- **AND** it SHALL keep processing usable

#### Scenario: Identical file is processed again
- **WHEN** a new completed run has the same exact-file fingerprint as an earlier run
- **THEN** the history SHALL show that the file was processed before without displaying the fingerprint
- **AND** the application SHALL preserve the separate run summaries

### Requirement: History is browsable and manageable
The application SHALL provide a localized history view ordered by completion time, with each entry showing its date, image dimensions, processing options, sticker count, and whether the exact file was processed before when a fingerprint is available. The user SHALL be able to delete one entry or clear all entries. History SHALL retain at most 50 entries and no entry older than 90 days; expired and excess entries SHALL be removed when the application next accesses history. History SHALL NOT restore an editor session or provide prior image or pack downloads.

#### Scenario: User browses history
- **WHEN** the user opens processing history
- **THEN** the application lists available records from newest to oldest with the specified summary fields
- **AND** it does not expose original file names, fingerprints, or image pixels

#### Scenario: User deletes one record
- **WHEN** the user deletes a history entry
- **THEN** that entry is removed from local history while other entries remain

#### Scenario: User clears history
- **WHEN** the user confirms clearing all history
- **THEN** all Rusticker history records are removed from local storage

#### Scenario: Retention limit is exceeded
- **WHEN** history is next read and contains records older than 90 days or more than 50 records
- **THEN** expired records are removed and only the 50 newest unexpired records remain

#### Scenario: History does not restore private content
- **WHEN** a user opens a history entry
- **THEN** the application shows its summary only and requires the user to select the source image again to process or export it

### Requirement: Local history storage failures do not block processing
The application SHALL store history only in browser-managed, same-origin local storage. It SHALL NOT request persistent-storage permission for history. If storage is unavailable, evicted, corrupt, or full, processing and export SHALL remain usable; the application SHALL report that the history entry could not be saved, preserve existing records where possible, and SHALL NOT upload data as a fallback.

#### Scenario: Browser storage is unavailable
- **WHEN** the user enables history but local storage cannot be opened
- **THEN** processing and export continue without recording the run
- **AND** the application gives a localized notice that history is unavailable

#### Scenario: Storage quota is exceeded
- **WHEN** a history write fails because browser storage has reached its quota
- **THEN** the current processing result remains usable
- **AND** the application does not evict existing records outside the stated retention policy or transmit any data

#### Scenario: Browser evicts local history
- **WHEN** the browser removes Rusticker's best-effort local storage
- **THEN** the application treats history as empty and continues to process images normally

### Requirement: History data never leaves the device
History records and fingerprints SHALL remain on the user's device. The application SHALL NOT include them in network requests, analytics, logs sent off-device, crash reports, synchronization, or WebMCP/tool interfaces. Clearing history SHALL delete the application's stored history records and fingerprint values.

#### Scenario: Network is inspected while history is enabled
- **WHEN** a user creates, views, or deletes history records
- **THEN** no network request contains a history record, fingerprint, file name, processing option, or user image data

#### Scenario: History is cleared
- **WHEN** the user clears all history
- **THEN** no Rusticker history record or fingerprint remains in the application's history database
