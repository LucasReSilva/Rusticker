## ADDED Requirements

### Requirement: Sticker previews enter without layout shifts
Newly rendered sticker preview cards SHALL fade in with a brief, non-essential opacity transition. The preview SHALL reserve its final dimensions before the transition begins, so the grid does not shift as it appears. When the user prefers reduced motion, previews SHALL render immediately without the transition. Sticker pixels and all editor behavior SHALL remain available regardless of motion preference.

#### Scenario: Newly detected sticker previews appear
- **WHEN** detection completes with one or more stickers
- **THEN** each new preview fades from transparent to fully visible
- **AND** the grid retains the preview's final layout space throughout

#### Scenario: Reduced motion is preferred
- **WHEN** the user's system requests reduced motion before or while sticker previews render
- **THEN** each preview is shown fully visible without an animated transition
- **AND** the grid and sticker controls remain usable
