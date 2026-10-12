## MODIFIED Requirements

### Requirement: Sticker separation
Each sticker returned by standard detection SHALL be one region of foreground pixels connected through any of their 8 neighbors (horizontal, vertical, or diagonal). Foreground regions that touch, even only diagonally, SHALL be returned as a single sticker by standard detection. The core SHALL provide a separate, explicit operation that proposes subdivisions for one selected sticker without changing the standard detection result. A proposal SHALL be deterministic, SHALL preserve every foreground pixel in exactly one proposed region, and SHALL leave the original sticker available until the user accepts the proposal. The application SHALL show the proposal for review and SHALL let the user accept or discard it; discarding or undoing SHALL restore the original sticker. The application SHALL NOT silently apply a proposed split to the export.

#### Scenario: Separate stickers
- **WHEN** an image contains three non-touching rectangles of different colors on the background
- **THEN** standard detection returns exactly three stickers

#### Scenario: Touching stickers remain combined by default
- **WHEN** two rectangles share an edge or are joined by a foreground bridge at least 3 pixels thick
- **THEN** standard detection returns them as one sticker

#### Scenario: Touching stickers merge
- **WHEN** two rectangles share an edge or are joined by a foreground bridge at least 3 pixels thick
- **THEN** they are returned as one sticker

#### Scenario: User requests a split proposal
- **WHEN** the user explicitly requests assistance for one detected sticker
- **THEN** the application displays deterministic candidate regions for review while preserving the original sticker

#### Scenario: User accepts a reviewed proposal
- **WHEN** the user accepts the displayed candidate regions
- **THEN** those regions replace the original sticker in the editor and are used by subsequent export

#### Scenario: User discards or undoes a proposal
- **WHEN** the user discards a proposal or undoes an accepted split
- **THEN** the original sticker is restored and remains available for export

#### Scenario: Ambiguous shape has no safe proposal
- **WHEN** the selected sticker cannot be divided under the proposal operation's safety limits
- **THEN** the application keeps the original sticker unchanged and reports no proposal through a localized status
