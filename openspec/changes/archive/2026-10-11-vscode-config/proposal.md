## Why

Developers working on Rusticker currently have to manually remember and execute multiple CLI commands across `web/` and `core/` (e.g. `bun run dev:all`, `bun run build:wasm`, `bun run check`, `cargo test`, `git-cliff`). Providing preconfigured VS Code tasks and launch debugging configurations in `.vscode/` standardizes the local developer workflow, streamlines browser and unit test debugging, and accelerates onboarding.

## What Changes

- Add `.vscode/tasks.json` with grouped and problem-matcher-equipped tasks for:
  - Development (`bun run dev`, `bun run dev:all`).
  - WebAssembly compilation (`bun run build:wasm`).
  - Production build and verification (`bun run build`, `bun run verify:build`).
  - Static checks, linting, and formatting (`bun run check`, `bun run lint`, `bun run format`).
  - Testing (`bun run test`, `bun run test:e2e`, `cargo test`).
  - Release tooling (`bun run changelog:preview`, `bun run version:check`, `bun run version:sync`).
- Add `.vscode/launch.json` configuring:
  - Web debugging in Chrome and Microsoft Edge targeting `http://localhost:5173`.
  - Node/Bun test debugging for Vitest.
  - Native debugging for Rust tests using `lldb` / `codelldb`.
- Add `.vscode/extensions.json` recommending essential extensions (Svelte, Rust-analyzer, Tailwind CSS, Prettier, ESLint, Paraglide Sherlock, CodeLLDB).
- Update `.gitignore` to ensure `.vscode/tasks.json`, `.vscode/launch.json`, and `.vscode/extensions.json` are tracked in version control while excluding user-specific editor files.
- **Out of scope:**
  - Modifying core Rust image processing code in `core/`.
  - Modifying frontend runtime application code in `web/src/`.
  - Committing developer personal workspace overrides or machine-specific paths in `.vscode/settings.json`.

## Capabilities

### Modified Capabilities

- `repository-foundation`: Extends repository foundation with normative requirements for standardized VS Code tasks, debugging launch configurations, and extension recommendations.

## Impact

- Touches `.vscode/tasks.json`, `.vscode/launch.json`, `.vscode/extensions.json`, and `.gitignore`.
- Neither `core/src/` nor `web/src/` runtime code is modified.
- Enhances developer tooling and VS Code integrated terminal / debugging experience.

