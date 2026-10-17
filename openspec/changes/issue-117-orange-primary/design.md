## Context

See `proposal.md` for motivation and `specs/` for the behavior contracts. The app already defines light and dark Rust-orange primary and WhatsApp-green supporting tokens in `web/src/app.css`, and the contrast checks cover those pairs. The shared header is used by the tool and content pages. About and how-to-use currently render plain document content; history has its own cards. StickerCard has icon-sized move/remove controls mixed with text actions, while the Storybook catalog currently demonstrates reusable design-system components.

The tool page and several shared files are being changed by open PR #133. This implementation must avoid the files listed in that PR until it merges, including the tool page, message catalogs, Preview, editor state, and its source-candidate module/tests. Use existing localized card action messages as accessible names and tooltip hints where suitable; any added visible or assistive copy requires matching entries in all three catalogs.

## Goals / Non-Goals

**Goals:**

- Strengthen the established orange-primary visual hierarchy through theme tokens and shared navigation styling while preserving verified contrast.
- Apply consistent content widths, heading hierarchy, spacing, and responsive grouping to the shared shell and content pages that can be edited safely.
- Make sticker actions compact, understandable, touch-usable, keyboard accessible, and localized.
- Make the visual review states inspectable in Storybook in both themes.

**Non-Goals:**

- Implementing or routing the planned upscaler page.
- Changing editor processing, sticker state, export behavior, or localization URL rules.
- Editing files owned by PR #133 before it merges.

## Decisions

1. **Keep the established semantic palette and refine its use.** Adjust only the shared token definitions and allowed shared components, then run the existing contrast checks. This preserves the current theme model and avoids introducing a parallel brand palette. Replacing the palette with component-local colors was rejected because it would make theme and contrast behavior inconsistent.

2. **Use shared shell styles and page-local structure for content pages.** Keep navigation in the shared header and place content in the app shell's existing main landmark; add semantic sections and consistent responsive widths to the how-to-use, about, and history pages. The tool page receives the shared theme and header automatically, while its source remains untouched during PR #133. A new layout framework or route change is unnecessary.

3. **Keep sticker actions as design-system buttons and add tooltip hints.** Use recognizable icons, localized accessible names, visible focus styles, and the existing button size variants. Tooltip text reuses the localized action label where it fully explains the action. Persistent accessible naming/description provides the fallback if a visual tooltip is unavailable. This preserves behavior and avoids a new UI primitive or dependency.

4. **Use Storybook-only comparative fixtures.** Add representative page and sticker-card states to the local catalog using existing tokens and components. Include the prior text-heavy action arrangement as a static review fixture and the current icon-first card behavior as the after state. Stories stay in the existing development-only Storybook build.

5. **Treat PR #133 overlap as a merge-time integration point.** Do not edit its file list while the PR is open. After it merges, recheck the claim and rebase or resolve shared token, navigation, and layout changes against the merged tree before final validation.

## Risks / Trade-offs

- [Icon meanings may be unclear without visible labels] → Pair each icon with a localized tooltip and accessible name, and show the textual before/after comparison in Storybook.
- [A tooltip may not appear on touch or when the trigger is disabled] → Keep the localized accessible name on the control and retain an accessible fallback independent of the tooltip.
- [Palette adjustments may lower contrast] → Keep the automated light/dark contrast suite and visual review states as acceptance checks.
- [The root tool page cannot be edited while PR #133 remains open] → Apply its shared treatment through allowed global theme and shell files, then recheck the integrated result after the PR merges.

## Migration Plan

No data or URL migration is required. Merge the shared presentation and localized action changes through the issue branch, then reconcile and revalidate overlaps after PR #133 merges. Roll back by reverting the presentation commit if an accessibility or visual regression is found.
