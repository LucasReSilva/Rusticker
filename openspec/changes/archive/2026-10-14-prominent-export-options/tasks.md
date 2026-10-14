## 1. Editor layout

- [x] 1.1 Move the localized WhatsApp and Telegram export section before the detected count and sticker grid; verify the page component test observes that order.
- [x] 1.2 Add a focused unit assertion for export controls preceding the grid and run the page component test (12 tests passed).

## 2. Responsive verification

- [x] 2.1 Extend the Playwright editor flow to assert export controls appear above the grid at 375 pixels with no horizontal overflow; the focused browser test passed.
- [x] 2.2 Validate the OpenSpec change and run relevant web checks (`openspec validate`, `bun run check`, and design lint passed).
