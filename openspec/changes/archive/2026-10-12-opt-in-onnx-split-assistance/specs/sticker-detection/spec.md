## ADDED Requirements

### Requirement: Opt-in assisted sticker separation
The application MAY offer a separate model-assisted proposal for a user-selected sticker after standard detection. It SHALL require an explicit user action and prompts identifying at least two intended regions. It SHALL NOT download model or inference assets or run model inference before the user requests this assistance. Inference SHALL execute on-device in a dedicated worker; user image pixels, prompts, and embeddings SHALL NOT be sent over the network. Before a first-use model download, the user SHALL be told the download size. Model and inference assets SHALL be version-pinned, integrity-checked, and excluded from the initial offline-install precache. The application SHALL show processing progress, allow cancellation, preserve the original sticker until acceptance, and require explicit review and acceptance before replacing it. Missing, invalid, offline, canceled, unsupported, or failed inference SHALL leave the original result and standard editor workflow usable.

#### Scenario: Assistance is requested explicitly
- **WHEN** the user selects one detected sticker and starts assisted separation
- **THEN** the application explains the model download size if its assets are not cached and requests prompts for the intended regions
- **AND** standard detection results remain visible and unchanged while assistance is prepared

#### Scenario: Model inference stays local
- **WHEN** assisted inference runs for user-selected regions
- **THEN** the image, prompts, and image embeddings are processed only in the browser worker
- **AND** any network requests contain only versioned model/runtime assets and no user-derived data

#### Scenario: Safe proposal is reviewed
- **WHEN** the model returns valid masks for the prompted regions
- **THEN** the application constructs candidate stickers from the original pixels and alpha, displays them as a proposal, and keeps the original sticker available until the user accepts

#### Scenario: Unsafe or empty proposal is rejected
- **WHEN** model masks are empty, substantially ambiguous, or cannot be reconciled with the selected sticker's foreground
- **THEN** the application shows no assisted proposal and leaves the original sticker unchanged

#### Scenario: User cancels or inference fails
- **WHEN** the user cancels assistance or a model asset, runtime, browser capability, or inference operation fails
- **THEN** the worker operation stops where possible, no partial result is applied, and the existing standard result remains usable

#### Scenario: Assistance assets are not installed by default
- **WHEN** the application is installed or first loaded without requesting assisted separation
- **THEN** neither the model files nor optional inference assets are fetched or included in the initial PWA precache
