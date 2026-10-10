# repository-foundation Specification

## Purpose

Defines the conventions every contribution to the Rusticker repository must follow — language, commit format, line endings, toolchain, ignored artifacts, and required documentation — so that humans and AI agents produce consistent work across all later changes.

## Requirements

### Requirement: English-only repository content
All source code identifiers, file and directory names, code comments, documentation, commit messages, and OpenSpec artifacts in the repository SHALL be written in English. The only exception is end-user interface text, which SHALL live exclusively in the localized message catalogs of the product.

#### Scenario: Contributor names a new module
- **WHEN** a contributor adds a new source file, type, function, or variable
- **THEN** its name is in English, for example `Sticker` or `detect` rather than `Figurinha` or `detectar`

#### Scenario: Localized text is required
- **WHEN** a feature needs text that end users will read
- **THEN** the text is added to the message catalogs for every supported locale and is not written inline in source code

### Requirement: Agents converse in the developer's language
The repository's agent instructions SHALL tell AI agents to reply to a developer in the language the developer uses, while still producing all repository content in English.

#### Scenario: Developer writes in Portuguese
- **WHEN** a developer gives an agent instructions in Portuguese
- **THEN** the agent replies in Portuguese
- **AND** any code, docs, commit messages, or specs the agent writes are in English

### Requirement: Conventional Commits are enforced
Commit messages SHALL follow the Conventional Commits specification, and the repository SHALL provide a commit-msg hook that rejects messages that do not comply.

#### Scenario: Non-conforming commit message
- **WHEN** a contributor with the pre-commit hooks installed commits with the message `initial files`
- **THEN** the commit is rejected with an explanation of the expected format

#### Scenario: Conforming commit message
- **WHEN** a contributor commits with the message `chore: initial project setup`
- **THEN** the commit-msg hook accepts it

### Requirement: Normalized line endings
Text files in the repository SHALL be stored with LF line endings regardless of the contributor's operating system.

#### Scenario: Commit from Windows
- **WHEN** a contributor on Windows with default Git settings commits a text file edited with CRLF line endings
- **THEN** the file is stored in the repository with LF line endings

### Requirement: Pinned Rust toolchain
The repository SHALL declare a pinned Rust toolchain that includes the formatter, the linter, and the `wasm32-unknown-unknown` compilation target. Anyone building the project then uses the same compiler and can target WebAssembly without manual setup.

#### Scenario: Fresh clone
- **WHEN** a contributor with rustup installed runs any `cargo` or `rustc` command inside the repository
- **THEN** rustup selects the pinned toolchain, installing it with `rustfmt`, `clippy`, and the `wasm32-unknown-unknown` target if missing

### Requirement: Build artifacts are not versioned
Generated build outputs and installed dependencies SHALL be excluded from version control. This includes Rust build output, the generated WebAssembly package, JavaScript dependencies, framework build caches, and static build output. The JavaScript lockfile SHALL remain versioned.

#### Scenario: After a full local build
- **WHEN** a contributor builds the Rust crate, generates the WebAssembly package, installs JavaScript dependencies, and builds the web app
- **THEN** `git status` reports no untracked files from those outputs

### Requirement: Project documentation is present and populated
The repository root SHALL contain populated versions of the following documents:
- a README describing the product, its privacy promise, the developer commands, and the roadmap;
- an architecture document;
- a design system and i18n guide;
- agent instructions;
- a contributing guide;
- a security policy;
- a changelog;
- a code of conduct;
- an authors list;
- a contributors list.

#### Scenario: New contributor onboarding
- **WHEN** a new contributor opens any of these documents
- **THEN** the document has substantive content and is not empty

### Requirement: Privacy promise is stated
The security policy and the README SHALL state that user images are processed entirely in the user's browser and never uploaded to any server. The security policy SHALL also describe how to report a vulnerability privately.

#### Scenario: User checks privacy
- **WHEN** a user or reviewer reads the README or the security policy
- **THEN** they find an explicit statement that images never leave the browser

#### Scenario: Researcher finds a vulnerability
- **WHEN** a security researcher reads the security policy
- **THEN** they find a private reporting channel and do not need to open a public issue
