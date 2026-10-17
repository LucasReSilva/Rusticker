## MODIFIED Requirements

### Requirement: App works offline after the first visit
After one successful online visit to any public page, the service worker SHALL have cached the application shell, every public page in every locale, the fallback page used for client-rendered routes, the icons, the manifests, and the detection and app-owned ONNX CPU/WASM runtime assets when the build contains them. While offline, navigating to any public URL in any locale MUST render that page in its locale, and the tool MUST be able to start detection without network access. The conventional upscaler SHALL remain available offline. Learned upscaling SHALL work offline when the app-owned runtime assets are cached and the user selects a compatible model from their device. The service worker MUST NOT cache user-selected model files.

#### Scenario: Offline navigation across locales
- **WHEN** a user visits `/` online once, goes offline, and then opens `/es/acerca-de`
- **THEN** the Spanish about page renders from the cache

#### Scenario: Tool works offline
- **WHEN** a user who visited the site once opens `/en/` while offline and the build includes the detection runtime
- **THEN** the English tool page loads and the detection runtime assets are served from the cache without any network request

#### Scenario: Conventional upscaler works offline
- **WHEN** a user who visited the site once opens the upscaler while offline
- **THEN** the page and conventional resize flow load without network access

#### Scenario: Learned upscaler works offline with a local model
- **WHEN** a user has visited the app while online, the app-owned inference runtime assets are cached, the user goes offline, and then selects a compatible model file from their device
- **THEN** learned inference runs without a network request and the user-selected model is not written to the service-worker cache

#### Scenario: Build without detection runtime
- **WHEN** the site is built before the detection runtime exists in the build output
- **THEN** the build succeeds and the offline cache covers every other listed asset
