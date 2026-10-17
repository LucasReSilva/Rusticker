## 1. Processing foundations

- [x] 1.1 Implement bounded PNG, JPEG, and static WebP dimension inspection, animation rejection, and validated scale/output math; verify format, malformed-header, animation, overflow, and limit cases with unit tests.
- [x] 1.2 Implement the dedicated worker protocol for local decode, Canvas resampling, PNG encoding, progress, stable failures, and termination-based cancellation; verify success, unsupported capability, failure, and cancellation paths in worker tests.

## 2. Localized upscaler interface

- [x] 2.1 Add the browser-only upscaler route with single-file selection, source/result previews, scale and output-dimension display, progress, cancel, retry, and locale-neutral PNG download using design-system components; verify keyboard-accessible controls and the processing lifecycle with component tests.
- [x] 2.2 Add page metadata, localized route slugs, shared header navigation, and complete `pt-BR`, `en`, and `es` messages; verify catalog parity, route resolution, and every locale's generated page.

## 3. Integration verification

- [x] 3.1 Add E2E coverage for localized route loading, a real image upscale/download, invalid/over-limit input, and cancellation; verify the focused Playwright suite passes at desktop and narrow viewport sizes.
- [x] 3.2 Run `bun run check`, `bun run lint`, `bun run test`, `bun run i18n:check`, `bun run lint:design`, `bun run build`, and `bun run verify:build` in `web/`; verify the static output includes localized upscaler documents and no user image data is requested over the network.
