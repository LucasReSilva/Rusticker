## Context

See `proposal.md` for motivation. The current app exports static WEBP and PNG through browser `OffscreenCanvas`, then packages the files locally. Animated decoding needs per-frame access, while animated output needs a container-aware encoder; a still canvas blob alone cannot establish either capability. Browser codec support depends on the concrete browser build, platform, codec profile, and hardware.

## Goals / Non-Goals

**Goals:**

- Measure exact file fixtures and API paths, including support checks and actual decode/encode, on available desktop and mobile browser targets.
- Distinguish image animation decoding, video frame extraction, image sequence encoding, and video encoding as separate capabilities.
- Measure peak decoded-frame memory and download/initial bundle costs from reproducible artifacts, and state when a requested metric cannot be measured on available hardware.
- Give a conservative initial matrix and explicit validation/fallback rules that preserve browser-local processing.

**Non-Goals:**

- Implement import or animated export in the product.
- Assume a generic browser MIME or codec support query proves preservation of alpha, timing, audio removal, or a target platform profile.
- Treat mobile emulation as a substitute for testing an actual mobile browser/device.

## Decisions

1. **Use synthetic, versioned fixtures.** Generate short, tiny, transparent and opaque GIF, animated WebP, APNG, MP4, and WebM files from scripted shapes and tones; record commands, tool versions, hashes, dimensions, frame timestamps, and alpha/audio characteristics. No private media is admitted.

2. **Separate browser paths.** Probe `ImageDecoder` support and frame iteration for animated images; probe `HTMLVideoElement`/`requestVideoFrameCallback` for containerized video; probe `VideoDecoder`/`VideoEncoder` only with exact codec strings; probe `OffscreenCanvas.convertToBlob` for still encodes. Verify WebM container output, WebP animation muxing, alpha, duration, timestamps, and audio tracks with an independent local media inspector. Treat a support query as a preflight only.

3. **Compare optional local codecs by role.** Screen maintained WASM options for image-sequence decode/encode and video demux/decode/encode independently. Record exact package/core build, codecs, license, compressed transfer bytes, cold start, peak memory, cancellation behavior, and offline operation. Do not bundle a candidate or infer capabilities from a package name; probe its actual build.

4. **Use target profile checks as hard output gates.** Derive WhatsApp animated WEBP limits and Telegram VP9 WebM limits from their current first-party documentation. Verify the generated artifact's dimensions, animation duration, byte size, codec, audio stream absence, frame rate, and alpha as applicable. A standards-valid file is not evidence that a specific importer accepts it.

5. **Report test boundaries.** Record browser product, full version, OS/device, API result, and fixture hash for every run. Mark unavailable iOS/Android devices or unmeasured thermal/peak-memory behavior as unresolved; do not fill gaps with compatibility tables or desktop emulation.

## Risks / Trade-offs

- **Browser tests vary by OS, codec pack, and hardware.** → Keep a per-environment matrix and choose a conservative baseline; gate optional inputs using runtime capability checks and actual decode.
- **Frame capture may skip or duplicate frames under load.** → Compare observed timestamps against fixture timing and report drift and scheduling method.
- **Transparent WebM VP9 support is uneven.** → Test alpha through decode and a pixel-level round trip separately on each target; do not assume VP9 implies alpha support.
- **WASM codec size and memory depend on build flags.** → Measure the exact candidate build and include compressed and expanded bytes; leave unmeasured builds unresolved.
- **Platform format requirements can change or describe a particular import flow.** → Date the source review and label platform requirements separately from browser capabilities and tested importer behavior.

## Migration Plan

No production migration applies. Add the completed evaluation report and link it from technical documentation. Any selected animated-media implementation requires a separate issue and OpenSpec change with its own import, privacy, memory, cancellation, output-profile, and device validation.
