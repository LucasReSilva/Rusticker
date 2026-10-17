## Why

Rusticker is considering richer completion and empty-state feedback, but a browser animation player could add transfer and execution cost to a small, offline-first app. The project needs measured evidence and a clear adoption boundary before adding a runtime.

## What Changes

- Compare locally bundled Lottie player options with native CSS/SVG motion for package size, startup and playback cost, offline behavior, and accessibility.
- Build a synthetic, locally served prototype that makes no external requests and has a static reduced-motion path.
- Publish the measurements, method, limitations, and recommendation in an evaluation report linked from the project documentation.
- No changes to `core/` or production behavior in `web/`; exclude runtime dependencies, production animation assets, and user-image data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a research and documentation change with no user-facing behavior change; `.openspec.yaml` sets `skip_specs: true`.

## Impact

- Add an isolated prototype/benchmark and an evaluation report under `docs/`.
- Update `README.md` and `ARCHITECTURE.md` with report links.
- No production API, dependency, Rust core, or UI changes.
