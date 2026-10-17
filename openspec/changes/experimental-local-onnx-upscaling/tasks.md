## 1. Runtime and ONNX contract

- [x] 1.1 Add a pinned, lazily loaded ONNX Runtime Web dependency and configure its CPU/WASM assets as same-origin build outputs; verify `bun install`, the runtime worker bundle, and the production asset manifest.
- [x] 1.2 Implement the supported RGB NCHW float x4 graph validation and sequential 64x64 tile mapping with 16-pixel overlap and midpoint crop; verify shape, normalization, coverage, boundary padding, and output-size cases with unit tests.
- [x] 1.3 Implement worker-side local model loading, inference progress, cancellation, session disposal, and separate alpha resizing; verify successful fake-session results, malformed model errors, non-finite output, cancellation, and memory preflight with worker tests.

## 2. User experience and localization

- [x] 2.1 Add an explicit experimental-mode selector and local ONNX file input to the existing upscaler page while preserving conventional resize as the default; verify the conventional flow does not import or initialize ONNX Runtime.
- [x] 2.2 Add model/backend disclosure, progress, cancel/retry, source/result comparison over light/dark transparency backgrounds, and localized recoverable errors; verify keyboard and screen-reader behavior and reduced-motion handling.
- [x] 2.3 Add or update upscaler route, page metadata, model controls, progress, errors, and accessible names in `pt-BR`, `en`, and `es`; verify `bun run i18n:check` and route localization tests.

## 3. Offline behavior and integration

- [x] 3.1 Ensure app-owned ONNX CPU/WASM assets are included in the offline cache while user-selected model and image bytes are excluded; verify the service-worker offline upscaler E2E test and base-path deployment test.
- [x] 3.2 Run the upscaler unit tests, web checks, design lint, production build, and relevant E2E tests; verify `bun run test`, `bun run check`, `bun run lint:design`, and `bun run build` pass from `web/`.
- [ ] 3.3 Update `AGENTS.md`/architecture or user documentation only where needed to explain model compatibility, CPU/WASM backend, local model selection, known latency/memory, and advisory quality limitations; verify documentation links and English repository text.
