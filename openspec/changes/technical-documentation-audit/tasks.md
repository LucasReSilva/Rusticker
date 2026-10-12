## 1. Read-only implementation audit

- [x] 1.1 Audit the Rust detector, tests, and detection spec in a read-only subagent pass; record HSV classification, ignored input alpha, 3x3 opening, 8-connectivity, size threshold, alpha smoothing, reading order, and framing with source paths.
- [x] 1.2 Audit the WASM and worker boundary in a read-only subagent pass; record decode, defensive copy/transfer, latest-wins behavior, worker recovery, Rust result freeing, and privacy boundaries with source paths.
- [x] 1.3 Audit frontend state and export in a read-only subagent pass; record curation, browser encoding, caching, ZIP creation, local download, and related behavior specs with source paths.

## 2. Evidence and technical documentation

- [x] 2.1 Reconcile subagent findings against current source, tests, and the reviewed OpenSpec specs; produce a claim-to-evidence/reference checklist and resolve any disagreement before editing prose.
- [x] 2.2 Update `ARCHITECTURE.md` to distinguish implemented behavior, limitations, and deferred work; verify every named module, threshold, and pipeline step against source/tests.
- [ ] 2.3 Add a Mermaid detector flowchart that accurately labels source-alpha handling and distinguishes the current binary-mask smoothing from general alpha matting; inspect the rendered diagram.
- [x] 2.4 Add a Mermaid end-to-end diagram for browser decode, main thread, worker, Rust/WASM, result transfer, local encoding, ZIP, and download; verify privacy and static-asset boundaries against code.
- [x] 2.5 Add a curated references section with stable links and version-pinned crate docs; for each entry, state the exact claim it supports and distinguish current methods from comparison/future methods.

## 3. Focused supporting documentation

- [x] 3.1 Update README architecture links or descriptions only where needed to direct readers to the revised current-state guide; verify all internal links resolve.
- [x] 3.2 Add focused Rust/TypeScript doc comments only if the audit finds a non-obvious behavior that cannot be clearly owned by `ARCHITECTURE.md`; if `core/` changes, run `cargo fmt --check`, `cargo test -p rusticker-core`, then `cd web && bun run build:wasm` to rebuild WASM and reinstall the local package; if `web/` changes, run `cd web && bun run check`.

## 4. Independent review and validation

- [x] 4.1 Ask a read-only subagent to review the finished diagrams and citations for source accuracy, unsupported claims, and privacy-boundary mistakes; resolve findings in the single-owner documentation edit.
- [ ] 4.2 Verify paper titles/identifiers, locked crate versions, and external links; validate Mermaid syntax with available project tooling or review GitHub's rendered Markdown without adding dependencies.
- [ ] 4.3 Run `openspec validate technical-documentation-audit --strict`, `git diff --check`, and relevant documentation formatting checks; run Rust/Web commands required by any touched source files and confirm no behavior or dependency changes.
