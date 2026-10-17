# Animated sticker media evaluation

**Reviewed:** 2026-10-17

**Decision:** No-go for shipping animated media import or export in Rusticker yet.

## Recommendation

On the tested Windows desktop Chromium builds, native `ImageDecoder` decoded all generated GIF, APNG, and animated WebP frames with the expected 100 ms timestamps. Native video APIs exposed VP9, H.264, and VP8 configurations, and the video element decoded the transparent VP9/WebM fixture. This is useful feasibility evidence for a follow-up prototype; it is not a supported-product matrix.

Do not ship animation support on this evidence. No physical Android or iOS browser was tested, MP4 frame extraction did not reach `loadeddata`, and no real target importer was exercised. A local native animated-WebP file passed browser frame, timing, alpha, size, and dimension checks, but it was never tested in WhatsApp. A VP9/WebM file passed container, codec, frame-rate, duration, size, and no-audio checks but decoded as completely transparent, so it is invalid output. In both tested browsers `VideoEncoder` emitted VP9 chunks when alpha was discarded, but rejected the same configuration with `alpha: "keep"`. WebCodecs emits encoded chunks and does not itself produce a WebM container. The tested canvas path only produced a still WebP. Transparent VP9/WebM output remains unproven.

For a separate prototype, keep browser-native frame decode as the first path and compare it with a locally bundled, deliberately reduced `libwebp` WASM build for animated WebP encoding. Treat Telegram VP9 WebM output as a separate, higher-risk path requiring an alpha-capable encoder and a local WebM muxer. Do not add either runtime until real Android/iOS tests, target-file inspection, resource/cancellation tests, and bundle/offline measurements pass. `ffmpeg.wasm` is a broader alternative to screen, but its upstream architecture fetches a separate WASM core into a worker; its size and cold-start cost were not measured here.

## Existing Rusticker boundary

The current app decodes still inputs via `createImageBitmap` and `OffscreenCanvas`, then encodes each sticker as a still WebP and PNG and builds the ZIP locally. The current export contract is static 512 × 512 media. Existing WEBP creation uses `OffscreenCanvas.convertToBlob({type: "image/webp"})`; this API probe returned a single still WebP. No production files, dependencies, core code, or behavior changed in this evaluation.

## Platform target profiles

WhatsApp's official third-party sticker guide says animated stickers must be WebP; packs must be all static or all animated and contain 3–30 stickers; each image is 512 × 512; an animated sticker is at most 500 KB; frames are at least 8 ms; animation duration is at most 10 seconds; and the first frame should be a complete image for a clean loop. The official Help Center also states 512 × 512, 500 KB, up to 30 per pack, and no more than 10 seconds of animation. These are format/pack constraints from WhatsApp sources, not evidence that a browser-produced file or Rusticker archive imports successfully. The referenced Android/iOS sample integration requires a platform pack integration; this evaluation did not run that importer.

Telegram's official video-sticker guide and import documentation require VP9 in a WebM container, no audio, one side exactly 512 px and the other no larger than 512 px, at most 30 FPS, 3 seconds, and 256 KB. Telegram's import documentation additionally specifies alpha-channel encoding for video stickers. This profile is distinct from Telegram's TGS vector-animated sticker format. These constraints are not satisfied merely by an encoder's VP9 support query.

## Test environment and fixtures

The original API probes used headless desktop Chrome 155.0.8059.79 and Microsoft Edge 155.0.4283.45 on Windows 10 Pro (reported Windows version 2009; OS build was unavailable). Both were run with SwiftShader/software rendering (`--headless=new --disable-gpu --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`) against a temporary loopback-only fixture server. Their reported user agents identify the HeadlessChrome/Headless Chromium 155 engine family. Edge's suffix was `Edg/155.0.0.0`. The additional local encode probe used headless Chrome 155.0.8059.79. These runs are not mobile-browser tests or hardware-performance measurements.

Fixtures were synthetic: 128 × 128 moving geometric shapes, 10 frames at 10 FPS for image animations and 1 second for video. APNG and one animated WebP had transparent corners; GIF and the other WebP were opaque. The MP4 contained H.264 video and AAC audio. The WebM contained VP9 video and no audio. FFmpeg/ffprobe version was `8.1.2-full_build-www.gyan.dev`.

| Fixture | Bytes | SHA-256 | Verified media properties |
| --- | ---: | --- | --- |
| `animated.gif` | 1,253 | `59E51C0BFADCA7F3EAF4B2905B2D4689D8517669BF2A9D14485E3D387FB92C93` | GIF, 128 × 128, 10 frames, 1 s, opaque corner |
| `animated.png` | 1,071 | `69250F514E83B7DC20AF8FB7C8D27E8DBF324E7FC6C2AB007F33DD2B2903FC70` | APNG, 128 × 128, 10 frames, transparent corner |
| `animated.webp` | 22,100 | `F54B5B4EB5D0814ED6E642066D863C0E20A4A386792F028346687F60C6358349` | Animated WebP, 128 × 128, 10 frames, opaque corner |
| `animated-alpha.webp` | 574 | `5C040E00DF6150E2B1FB3000D2DDAC7924E337E282F83B03AACB86A325E520DB` | Animated WebP, 128 × 128, 10 frames, transparent corner |
| `audio.mp4` | 21,557 | `5862F41FFCB5CDC9882D7EA911165FF1F62357B4B270E26DF37CA5592489EFEE` | 1 s, 128 × 128, H.264 10 FPS + AAC audio |
| `alpha.webm` | 1,071 | `706BAB9B6F79C9EA331229DDB05C0CE1AD80E142E8F2CBF47FB36F2128F20DEF` | 1 s, 128 × 128, VP9 10 FPS, transparent corner, no audio |

The fixture bytes were kept outside the repository. To regenerate equivalent fixtures with FFmpeg 8.1.2, produce a 10-frame transparent RGBA PNG sequence at 128 × 128 using a transparent lavfi base and a 24 × 24 opaque red square overlaid at `x='5+5*n':y=40:eval=frame`; encode that sequence as APNG (`-plays 0`), animated WebP (`-loop 0`), and GIF (`-loop 0`, with the GIF background intentionally opaque). Produce the opaque WebP from the same 10-frame sequence with an opaque background. For the video pair, use 128 × 128, 10 FPS, 1-second `testsrc2` video: encode MP4 with `libx264 -pix_fmt yuv420p` and a 1-second 440 Hz AAC sine track; encode WebM with `libvpx-vp9 -pix_fmt yuva420p` and no audio. Verify streams, dimensions, duration, frame count/rate, and audio presence with:

```sh
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate,nb_frames -of json FIXTURE
sha256sum FIXTURE
```

The animated WebP fixtures' dimensions and frame count were verified by browser `ImageDecoder`; this FFmpeg build's `ffprobe` emitted `image data not found` for those two files, so that tool was not treated as their verifier.

## Results

| Format and path | Chrome 155 | Edge 155 | Evaluation |
| --- | --- | --- | --- |
| GIF via `ImageDecoder` | `isTypeSupported(image/gif)` true; 10/10 frames decoded; timestamps 0–900,000 µs in 100,000 µs steps; corner alpha 255 | Same | Pass for this synthetic opaque fixture on these desktop builds only |
| APNG via `ImageDecoder` | `isTypeSupported(image/png)` true; 10/10 frames decoded at 100,000 µs steps; corner alpha 0 | Same | Pass for this synthetic alpha fixture on these desktop builds only |
| Animated WebP via `ImageDecoder` | `isTypeSupported(image/webp)` true; 10/10 frames from both fixtures at 100,000 µs steps; alpha fixture corner 0, opaque fixture corner 255 | Same | Pass for these synthetic fixtures on these desktop builds only |
| MP4/H.264 + AAC via `<video>` | `canPlayType` was `probably`; metadata loaded (1 s, 128 × 128); `loadeddata` timed out | Same | Frame extraction unresolved; support string and metadata are not a decode pass |
| WebM/VP9 alpha via `<video>` | `canPlayType` was `probably`; loadeddata reached `readyState=4`; 1 s, 128 × 128; canvas sample corner alpha 0 | Same | First-frame playback and alpha pass on this fixture; duration/frame scheduling and target profile remain unverified |
| VP9 `VideoEncoder` into chunks | 10 chunks, 336 bytes, flush succeeded with alpha discarded; `alpha: "keep"` unsupported | Same | Confirms video elementary chunks only; no WebM container, audio mux policy, or valid Telegram output produced |
| `OffscreenCanvas.convertToBlob` still WebP | `image/webp`, 518 bytes | Same | Still-image capability only; not animated output |
| VP9, VP8, H.264 WebCodecs support checks | `VideoDecoder` and default/discard `VideoEncoder` configs returned supported for `vp09.00.10.08`, `vp09.02.10.10`, `vp8`, and `avc1.42001E` | Same | A support query is configuration-specific and does not prove alpha, muxing, or target compatibility |

`ImageDecoder` and `OffscreenCanvas` were present; `ImageEncoder` was absent; `VideoEncoder` and `VideoDecoder` were present. WebCodecs `alpha: "keep"` was unsupported for the probed VP9 configuration (and earlier configuration checks also rejected `keep` for VP8/H.264). WebCodecs does not require a specific codec in every browser. `HTMLMediaElement.canPlayType()` is a hint, and `MediaCapabilities.decodingInfo()` returned `supported: true`, `smooth: true`, `powerEfficient: false` for the tested MP4 and WebM descriptors; these preflight results do not override the MP4 frame-load failure.

## Input/output matrix and limits

| Input or output | Current recommendation | Why / remaining gate |
| --- | --- | --- |
| GIF, APNG, animated WebP input | Prototype as optional inputs behind runtime API checks and actual decode | 10-frame synthetic fixtures decoded on Chrome/Edge desktop. Physical iOS/Android, larger files, disposal/blend edge cases, malformed media, memory, and cancellation remain untested. |
| MP4 input | Do not promise support yet | Metadata and capability preflight passed, but `loadeddata` and seek/frame extraction timed out in headless runs. Audio-bearing source handling and explicit audio stripping were not exercised end-to-end. |
| WebM input | Prototype separately behind runtime checks | This synthetic VP9 alpha fixture decoded a first frame. Other VP9 profiles, VP8, AV1, hardware paths, seeking, timing drift, and mobile implementations remain untested. |
| WhatsApp animated WebP output | Candidate for a separate local WebP animation encoder prototype; not supported now | A native FFmpeg `libwebp_anim` output decoded as 10 transparent 512 × 512 frames with 100 ms timing and was below 500 KB. It was not generated in WASM or submitted to an official importer. |
| Telegram VP9 WebM output | No-go until alpha-capable encode and mux are demonstrated on target devices | Tested WebCodecs VP9 encoder refused `alpha: "keep"`; a native FFmpeg VP9/WebM output had no audio and fit basic size, frame-rate, dimension, and duration limits but decoded as fully transparent. No valid Telegram output or importer pass was produced. |

No optional WASM codec build was installed or run, so codecs/build flags, compressed and expanded bundle bytes, cold start, cancellation, peak memory, offline behavior, and performance remain unresolved. No user media was used or uploaded. The probe served generated files only from loopback. No actual phone/tablet or Firefox/Safari browser was available. Mobile user-agent emulation would not close this gap and was not counted as testing.

## Additional local encode and container probe

This offline baseline was run on 2026-10-17 with FFmpeg/ffprobe `8.1.2-full_build-www.gyan.dev` and headless Chrome `155.0.8059.79` on Windows 10 Pro (reported version 2009). The reproducible harness is `tools/animated-media-evaluation/run-local-encode-probe.ps1`; it generates transparent moving bars in memory, writes outputs under `%TEMP%`, probes the containers, hashes the files, and decodes the outputs in the local browser. It uses no user media or network service.

| Native output candidate | Local result | Evaluation |
| --- | --- | --- |
| Animated WebP, FFmpeg `libwebp_anim` | 604 bytes; SHA-256 `51715FCD2C968830567E535C89DB2BC56F9B0082E307B5499F9A694BA5FF9D45`; Chrome `ImageDecoder` found 10 frames at 512 × 512, 100,000 µs per frame, with frame 0 at 0 µs and frame 9 at 900,000 µs; transparent corner and opaque bar pixels were verified on both sampled frames | Passes local container decode, sample alpha, timing, dimensions, and file-size checks for this synthetic 1-second file. `ffprobe` reports `image data not found` for this animated WebP, so Chrome was the verifier. This is a native encoder baseline, not a WASM result or WhatsApp-import pass. |
| VP9/WebM, FFmpeg `libvpx-vp9` | 9,246 bytes; 30 frames at 512 × 512 and 30 FPS; 1 second; `ffprobe` identifies Matroska/WebM and VP9 with no audio stream; Chrome loaded the video, but an alpha scan of its first decoded frame found min/max alpha 0 and zero nontransparent pixels | Fails usable output: the artifact is fully transparent. `ffprobe` reports `yuv420p`, and FFmpeg `alphaextract` reports that no alpha plane is available. The size and container checks do not compensate for the missing sticker pixels. |

The local environment had no `emcc`, `emcmake`, or Docker executable and no cached `libwebp` WASM or `ffmpeg.wasm` package. Therefore no reduced WASM build could be reproduced from the available local toolchain and cache. The native FFmpeg results above do not stand in for a WASM codec comparison. WASM compressed/expanded bytes, offline loading, cold start, cancellation, memory, and performance remain unmeasured.

Any follow-up output must be inspected locally after encoding, not accepted from an API support result: verify container and codec, dimensions, encoded bytes, frame count and per-frame timing, total duration and looping, alpha after decoding representative frames, and absence of audio for Telegram WebM. Run the appropriate official importer workflow on real target devices before claiming platform compatibility. Bound peak live decoded frames and release `VideoFrame`/decoder resources; measure cancellation latency, peak memory, cold start, initial and lazy-loaded bundle bytes, and offline operation on named devices. None of those resource or importer gates passed in this evaluation.

## Reproduction and validation commands

With the fixtures served from `127.0.0.1:8765`, the browser probes used the standard browser flags shown below. Run each browser against a local HTML probe that calls `ImageDecoder.isTypeSupported()`, decodes each `frameIndex`, copies RGBA pixels to inspect alpha/timestamps, then exercises `VideoEncoder.isConfigSupported()` and `encode()/flush()` with `alpha: "discard"` and `"keep"`. The temporary probe HTML and binaries were not committed; fixture-generation parameters and SHA-256 values above define the tested inputs.

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --no-sandbox --no-first-run --no-default-browser-check --disable-gpu --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --user-data-dir=$env:TEMP\rusticker-animated-media-chrome --virtual-time-budget=10000 --dump-dom http://127.0.0.1:8765/probe.html
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --no-sandbox --no-first-run --no-default-browser-check --disable-gpu --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --user-data-dir=$env:TEMP\rusticker-animated-media-edge --virtual-time-budget=10000 --dump-dom http://127.0.0.1:8765/probe.html
```

## Sources reviewed 2026-10-17

- [WhatsApp official sticker sample app, iOS integration guide](https://github.com/WhatsApp/stickers/blob/main/iOS/README.md): animated WebP-only format, 512 × 512, 500 KB, 8 ms minimum frame duration, 10-second maximum, complete first frame, and all-static or all-animated packs of 3–30.
- [WhatsApp official sticker sample app, Android validator](https://github.com/WhatsApp/stickers/blob/main/Android/app/src/main/java/com/example/samplestickerapp/StickerPackValidator.java): validates WebP frame count, frame duration, total duration, dimensions, file size, and pack animation mode.
- [WhatsApp Help Center](https://faq.whatsapp.com/1056840314992666): current end-user sticker dimensions, size, count, and animation duration summary.
- [Telegram VP9 WebM encoding guide](https://core.telegram.org/stickers/webm-vp9-encoding) and [Telegram sticker import documentation](https://core.telegram.org/import-stickers): VP9/WebM, alpha, no audio, dimensions, frame rate, duration, and size constraints.
- [W3C WebCodecs Working Draft](https://www.w3.org/TR/webcodecs/): published 2026-10-07; browser codec combinations are not guaranteed, alpha preservation is an option rather than a universal encoder promise, and encoded chunks are separate from target container packaging.
- [WHATWG HTML media standard](https://html.spec.whatwg.org/multipage/media.html): `canPlayType()` capability hint semantics.
- [libwebp animation encoder API](https://github.com/webmproject/libwebp/blob/main/doc/api.md): upstream animated WebP encoder candidate.
- [ffmpeg.wasm architecture](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/overview.md): upstream worker and WASM core loading model. No Rusticker-specific build size or runtime measurement was made.

### Offline local encode reproduction

Regenerate the additional native encoder/container baseline with the local FFmpeg and Chrome installations:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/animated-media-evaluation/run-local-encode-probe.ps1
```

The script stores generated binaries and the Chrome profile in `%TEMP%\rusticker-animated-media-local-probe`. `ffprobe` cannot inspect the resulting animated WebP in this FFmpeg build; the browser probe checks its frame count, first/last timestamps, dimensions, duration, and representative transparent/opaque pixels instead. The WebM alpha scan examines the decoded first frame and reports the observed all-transparent output. No optional codec download or WASM build is part of this reproduction.
