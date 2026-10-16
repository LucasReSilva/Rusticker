## 1. Storybook Setup

- [x] 1.1 Add compatible Storybook development dependencies and Bun scripts; verify the lockfile updates with `bun install`.
- [x] 1.2 Configure the SvelteKit framework, local story discovery, preview styles, and light/dark theme toolbar; verify `bun run storybook` starts successfully.

## 2. Component Stories

- [x] 2.1 Add representative stories for Button, Card, Badge, Slider, Progress, and Dialog variants or states; verify all six component groups appear in the preview.
- [x] 2.2 Verify both preview themes use application tokens and the stories load without external asset requests.

## 3. Integration Verification

- [x] 3.1 Build static Storybook output and the production app, then verify Storybook artifacts do not enter the production app output.
- [x] 3.2 Run `bun run check`, `bun run lint`, and `bun run lint:design` from `web/` and resolve any failures introduced by this change.
