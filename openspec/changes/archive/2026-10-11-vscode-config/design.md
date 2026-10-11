## Context

See `proposal.md` for motivation. Rusticker is a monorepo consisting of a Rust core (`core/`) and a static SvelteKit web frontend (`web/`). Developers currently run tasks and debug tests via shell commands. VS Code is the primary development environment, but the repository lacked tracked workspace tasks, launch configurations, and extension recommendations in `.vscode/`.

## Goals / Non-Goals

**Goals:**
- Provide a comprehensive, organized `.vscode/tasks.json` mapping all build, dev, lint, format, and test commands across Bun and Cargo.
- Provide a `.vscode/launch.json` covering browser debugging (Chrome, Edge) and test debugging (Vitest and Cargo).
- Provide `.vscode/extensions.json` recommending language and tooling extensions.
- Ensure all workspace configuration files are tracked in `.gitignore` while keeping user-specific settings untracked.

**Non-Goals:**
- Adding personal developer workspace settings (e.g. personal themes, zoom levels, or local paths).
- Modifying project runtime code in `core/` or `web/`.

## Decisions

### Decision 1: Task Organization in `.vscode/tasks.json`
- Group tasks logically:
  - **Build**: `build:wasm` (wasm-pack + bun install), `build:web` (vite build, default build task), `verify:build`.
  - **Test**: `test:unit` (Vitest, default test task), `test:e2e` (Playwright), `test:rust` (cargo test), `test:rust-sample`.
  - **Dev & Tooling**: `dev` (Vite server), `dev:all` (wasm rebuild + Vite), `check` (svelte-check), `lint` (Prettier & ESLint), `format`, `cargo:clippy`, `cargo:fmt`, `changelog:preview`, `version:sync`, `version:check`.
- Set explicit `options.cwd` (`${workspaceFolder}/web` for bun scripts, `${workspaceFolder}` for root cargo/tooling scripts).
- *Alternative considered*: Running bun from root without cwd. Rejected because `web/` is the subproject directory containing `package.json`.

### Decision 2: Launch Configurations in `.vscode/launch.json`
- Browser debugging:
  - `Launch Chrome against localhost:5173` (type `pwa-chrome` or `chrome`).
  - `Launch Edge against localhost:5173` (type `pwa-msedge` or `msedge`).
  - Web root mapped to `${workspaceFolder}/web`.
- Test debugging:
  - Vitest test debugging configuration using Node/Bun inspector.
  - Rust debugging configuration using `vadimcn.vscode-lldb` (CodeLLDB) executing `cargo test --no-run`.

### Decision 3: Recommended Extensions in `.vscode/extensions.json`
- Recommend:
  - `svelte.svelte-vscode` (official Svelte language support)
  - `rust-lang.rust-analyzer` (official Rust analyzer)
  - `esbenp.prettier-vscode` (code formatting)
  - `dbaeumer.vscode-eslint` (code linting)
  - `bradlc.vscode-tailwindcss` (Tailwind CSS v4 class completion)
  - `inlang.vs-code-extension` (Paraglide / Sherlock i18n support)
  - `vadimcn.vscode-lldb` (CodeLLDB for Rust test debugging)

### Decision 4: Git Tracking in `.gitignore`
- Update `.gitignore` to whitelist:
  ```gitignore
  !.vscode/extensions.json
  !.vscode/settings.json
  !.vscode/tasks.json
  !.vscode/launch.json
  ```
  while keeping general `.vscode/*` files (like user-local state or cache) ignored.

## Risks / Trade-offs

- *[Risk] Developers using different browsers (e.g. Firefox or Safari)* → Mitigation: Provide both Chrome and Edge configurations in `launch.json`; developers can add browser-specific configurations locally if desired.
- *[Risk] Path conversions on Windows Git Bash vs PowerShell* → Mitigation: Use standard VS Code variable interpolation (`${workspaceFolder}`) and explicit `cwd` options.

