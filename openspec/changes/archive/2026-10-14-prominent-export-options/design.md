## Context

See proposal.md for motivation. The tool page currently renders the detected-count summary and sticker grid before the export section inside the editor's second column. Existing export components already wrap their controls and use localized labels and design-system buttons.

## Goals / Non-Goals

**Goals:** Put both export flows before the grid in DOM order and preserve a compact layout at narrow mobile widths.

**Non-Goals:** Change export behavior, add headings or explanatory copy, or alter sticker ordering and curation.

## Decisions

- Move the existing export section above the detected-count summary and grid in the second editor column. This keeps the existing component boundaries, preserves all export state, and gives screen readers the same useful order as the visual layout. CSS reordering was considered but would leave DOM and reading order inconsistent.
- Keep the current responsive grid and component wrapping behavior. Use the 375-pixel browser flow to catch any overflow introduced by the new position instead of adding layout-specific width constants.
- Verify section order in the page component test and viewport fit in Playwright, alongside the existing editor tests.

## Risks / Trade-offs

- Export actions may take more vertical space above the grid on mobile. The controls are already compact and wrapping; the grid remains directly below them.

