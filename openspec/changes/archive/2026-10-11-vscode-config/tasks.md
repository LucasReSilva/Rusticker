## 1. Git Tracking Configuration

- [x] 1.1 Update `.gitignore` to allow tracking `.vscode/tasks.json` and `.vscode/launch.json` alongside `.vscode/extensions.json`. Verify using `git check-ignore -v .vscode/tasks.json` to confirm it is not ignored.

## 2. VS Code Workspace Tasks & Extensions

- [x] 2.1 Create `.vscode/tasks.json` defining tasks for dev servers, WebAssembly compilation, static build, testing, linting, formatting, and versioning. Verify valid JSON syntax.
- [x] 2.2 Create `.vscode/extensions.json` recommending essential extensions for Svelte, Rust, Tailwind CSS, Prettier, ESLint, Paraglide, and CodeLLDB. Verify valid JSON syntax.

## 3. VS Code Debug Launch Configuration

- [x] 3.1 Create `.vscode/launch.json` configuring web browser debugging (Chrome and Edge), Vitest test debugging, and Rust native test debugging. Verify valid JSON syntax.

## 4. Verification & Quality Gates

- [x] 4.1 Format and validate JSON files in `.vscode/` with `bun run lint` and `prettier`. Verify 0 errors.
- [x] 4.2 Run repository test and validation suites: `cargo test` and `bun run test`. Verify all tests pass.
- [x] 4.3 Validate OpenSpec change with `openspec validate --all`. Verify all pass with 0 errors.

