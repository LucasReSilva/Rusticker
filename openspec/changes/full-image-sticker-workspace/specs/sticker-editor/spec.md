## ADDED Requirements

### Requirement: Edit sticker candidates in the full-source workspace
The editor SHALL let users create a sticker candidate by drawing a source-image box over undetected content, move or resize an existing candidate's source box, and remove a candidate from the full-source workspace. Each accepted candidate SHALL retain a valid integer source-image box and a transparent 512x512 sticker image derived from the source pixels within that box using the active background and tolerance settings. The source overlay, sticker preview, kept set, tray icon, and every export SHALL reflect the same accepted candidate state. Empty, invalid, or out-of-image edits SHALL leave the previous state unchanged. Users SHALL be able to undo or revert accepted workspace edits.

#### Scenario: Add a missed sticker from the source image
- **WHEN** a user draws a valid box around undetected sticker content and the source pixels produce a sticker candidate
- **THEN** the candidate appears in the source overlay and curation grid with matching transparent pixels and is available to previews and exports

#### Scenario: Reject an empty or invalid box
- **WHEN** a user attempts to create, move, or resize a candidate with an empty, fractional, invalid, or out-of-image box
- **THEN** the current boxes, pixels, previews, and export set remain unchanged

#### Scenario: Move or resize a candidate
- **WHEN** a user moves or resizes a candidate box and applies the edit
- **THEN** its box remains aligned to integer source-image pixels and its transparent sticker image is regenerated from that source region

#### Scenario: Remove a candidate from the source workspace
- **WHEN** a user confirms removal of a selected candidate in the full-source workspace
- **THEN** its overlay, curation card, tray-icon eligibility, and export data are removed together

#### Scenario: Undo a workspace edit
- **WHEN** a user undoes or reverts a successful add, box edit, or removal
- **THEN** the prior candidate boxes, pixels, curation order, and export set are restored together

### Requirement: Review split candidates in the full-source workspace
The editor SHALL let users request a split for a selected source-image candidate, review proposed replacement candidates against the source image, and accept or discard the proposal. Accepting a proposal SHALL replace the source candidate with its reviewed candidates at its position in curation order; each replacement SHALL have a valid source box and transparent pixels matching that source region. Discarding SHALL preserve the source candidate. Accepted splits SHALL be undoable.

#### Scenario: Accept a reviewed split
- **WHEN** a user accepts a proposal containing at least two valid replacement candidates
- **THEN** the original candidate is replaced by those candidates in order and the source overlays, previews, and exports show the replacements

#### Scenario: Discard a split proposal
- **WHEN** a user discards a split proposal
- **THEN** the original candidate, source box, preview, order, and exports remain unchanged

#### Scenario: Reject invalid split replacements
- **WHEN** a split proposal contains fewer than two valid candidates or any invalid source geometry
- **THEN** the proposal cannot be accepted and the source candidate remains unchanged

### Requirement: Operate source workspace controls accessibly
All source-workspace creation, selection, move, resize, split, removal, undo, and revert controls SHALL support pointer and touch interaction and provide keyboard-operable alternatives. New visible and assistive text SHALL be localized in every supported locale. Source-coordinate edits SHALL remain usable with reduced motion and all image data SHALL stay on the user's device.

#### Scenario: Create and adjust candidates without a pointer
- **WHEN** a keyboard user creates or selects a candidate and operates its move or resize controls
- **THEN** the controls update valid source-image coordinates and expose their purpose and current candidate through localized accessible information

#### Scenario: Operate with touch and reduced motion
- **WHEN** a touch user creates or adjusts candidates while reduced motion is enabled
- **THEN** the controls remain operable without non-essential movement animation

#### Scenario: Keep source data local
- **WHEN** the user creates, adjusts, splits, removes, or restores candidates
- **THEN** source image data and derived sticker pixels remain in browser memory and no network request carries them
