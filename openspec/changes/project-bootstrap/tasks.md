## 1. Repository hygiene

- [x] 1.1 Add `.gitattributes` (`* text=auto eol=lf` plus binary entries for images, `.wasm`, `.zip`); verify with `git check-attr -a README.md` showing `eol: lf`
- [x] 1.2 Add `.editorconfig` per design.md Decision 7; verify the file exists and the editor picks it up (no reformat of existing files is needed)
- [x] 1.3 Add `.gitignore` per design.md Decision 7; verify `git check-ignore target/ core/pkg/ node_modules/ web/.svelte-kit/ web/build/` (trailing slashes needed for non-existent dirs) prints all five paths and `git check-ignore web/bun.lock` prints nothing
- [x] 1.4 Add `rust-toolchain.toml` (`channel = "1.98"`, components `rustfmt`, `clippy`, target `wasm32-unknown-unknown`); verify `rustup show active-toolchain` from the repo root reports 1.98 and the reason is the override file

## 2. Agent and OpenSpec configuration

- [x] 2.1 Write `AGENTS.md`: language policy (English content, reply in developer's language), Bun-only rule, Conventional Commits, OpenSpec workflow, wasm rebuild + reinstall rule, document map; verify every rule from spec "English-only repository content" and "Agents converse in the developer's language" is stated
- [x] 2.2 Add `CLAUDE.md` containing only `@AGENTS.md`; verify the file content
- [x] 2.3 Fill `openspec/config.yaml` `context` and `rules` per design.md Decision 6; verify `openspec instructions proposal --change project-bootstrap --json` runs without error and includes the context

## 3. Project documentation

- [x] 3.1 Write `README.md`: pitch, privacy promise, planned stack, quick-start commands (`wasm-pack build core --target web`, `bun install`, `bun run dev`, `bun run build`, `build:wasm`, `dev:all`, `i18n:check`) marked with the change that introduces them, roadmap of changes 2-8; verify privacy statement is present
- [x] 3.2 Write `ARCHITECTURE.md`: monorepo layout, ASCII data-flow diagram, algorithm steps with all parameters, Rust/JS split with English names from design.md Decision 1, error codes, WhatsApp rules, deferred work (watershed, segmentation model, RTL); verify every parameter from the brief appears
- [x] 3.3 Write `DESIGN.md`: design-system rules, tokens, theme, planned components, accessibility baseline, logical utilities, `/_design` route, and the full i18n section; verify each bullet of the brief's "Design system" and "Internationalization" sections is covered
- [x] 3.4 Write `CONTRIBUTING.md`: prerequisites, `prek install -t pre-commit -t commit-msg` (pre-commit also works), commit/branch conventions, OpenSpec flow, how to add a locale and a design-system component (marked as applicable after `web-scaffold`); verify the commands are copy-pasteable
- [x] 3.5 Write `SECURITY.md`: local-only processing statement, supported versions, private reporting via GitHub private vulnerability reporting (link placeholder noted until a remote exists); verify both privacy scenarios of the spec are satisfied
- [x] 3.6 Write `CHANGELOG.md` (Keep a Changelog, `Unreleased` with this setup), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `AUTHORS.md` (Lucas Silva), `CONTRIBUTORS.md` (header + empty list); verify none of the ten root documents is empty (`find . -maxdepth 1 -name '*.md' -empty` prints nothing)

## 4. First commit

- [x] 4.1 Install hooks with `prek install -t pre-commit -t commit-msg`; verify `.git/hooks/pre-commit` and `.git/hooks/commit-msg` exist
- [x] 4.2 Stage everything (`git add -A`) and run `git add --renormalize .`; verify `git ls-files --eol` shows `i/lf` for every text file and `git status` lists no build artifacts
- [x] 4.3 Verify the Conventional Commits hook rejects a bad message: `git commit -m "initial files"` must fail and `git log` must still report no commits
- [ ] 4.4 Commit with `chore: initial project setup`; verify the commit-msg hook passes and `git log --oneline` shows exactly one commit
