# Browser smoke evidence

Verified on 2026-10-16 against branch commit `5bcb888`, on Windows with Chrome
`155.0.8059.79`, Bun `1.3.14`, and the installed Playwright CLI `1.64.0`.
The run used a disposable browser profile, a local Vite server, and the actual
`document.modelContext` implementation. No normal browser profile was changed,
and no API mock or Origin Trial token was used.

## Setup and execution

From `web/`, start the local app:

```sh
bun run dev -- --host 127.0.0.1 --port 5183 --strictPort
```

The temporary Playwright configuration used `channel: 'chrome'`,
`headless: true`, one worker, and `http://127.0.0.1:5183/` as its base URL.
The two projects supplied these browser launch arguments:

| Scenario | Launch arguments                                            | Observed API                                                                          |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Enabled  | `--enable-features=WebMCP --enable-blink-features=WebMCP`   | Real `document.modelContext`, including `registerTool`, `getTools`, and `executeTool` |
| Disabled | `--disable-features=WebMCP --disable-blink-features=WebMCP` | `document.modelContext` was `undefined`                                               |

The local harness and configuration were kept under the Git-ignored
`web/playwright/.cache/issue51-smoke/` directory. Execute the retained local
harness from the same worktree with:

```sh
bun run test:e2e -- --config playwright/.cache/issue51-smoke/playwright.config.ts
```

Result: **2 tests passed** in 9.1 seconds. The harness uses the existing
`e2e/whatsapp-export/helpers.ts` helpers to paint and upload a synthetic sheet,
read the downloaded ZIP, and decode its images. The fixture contains three
separated colored rectangles on a uniform green background. No user image or
private archive was used, committed, or uploaded.

## Enabled API scenario

1. Open `/en/` and wait for the editor to mount.
2. Discover tools with `document.modelContext.getTools()`: exactly
   `get-editor-status` and `open-image-picker`, with localized titles and empty
   object schemas that reject additional properties. The status tool has
   `readOnlyHint: true`.
3. Execute the status tool with `{}`: the bounded result is `{"status":"empty"}`.
   Chrome serializes the returned object into a JSON string; the test parses
   that string before comparing the exact result.
4. Supply an extra input property to the status tool: execution is rejected.
5. Execute the picker tool with `{}`: the bounded result is
   `{"result":"picker-opened"}`. The real browser allowed opening the picker;
   the focused unit tests cover the unavailable/activation-failure path.
6. Upload the synthetic sheet through the existing file input and await three
   detected sticker cards. The status becomes `{"status":"ready-to-export"}`.
7. Select the second sticker as the tray image using the normal editor control.
8. Change the interface from English to Spanish. Tool discovery still returns
   exactly two tools with the Spanish titles, and the status tool remains
   callable. This verifies cleanup and replacement of localized registrations.
9. Wait for the page to become idle, put the browser context offline, and
   download the pack using the visible Spanish export button.

## Disabled API scenario

Open `/en/` with the disabling flags and confirm that `document.modelContext`
is absent. Upload the same synthetic sheet through the normal editor input,
await three detected stickers, put the browser offline after network idle,
and download the pack through the visible export button.

## Archive and privacy checks

Both scenarios downloaded `rusticker-pack-1.zip` with exactly seven entries:
three `sticker_XX.webp` images, three `png/sticker_XX.png` images, and
`tray_icon.png`. All sticker images decoded at 512 by 512 pixels, with
transparent corners. The tray decoded at 96 by 96 pixels. Each WEBP was below
100,000 bytes (1,898 to 1,906 bytes in the enabled run). The enabled run also
verified opaque sticker centers. Neither scenario raised a page JavaScript
error, sent a write request to the application origin, or made an HTTP request
during offline export.

The host's Kaspersky installation injects an external script into Chrome pages.
The final smoke harness blocked all external HTTP(S) requests before navigation;
the only blocked external host observed was
`gc.kis.v2.scr.kaspersky-labs.com`. This host is outside Rusticker's application
code. The evidence therefore covers the app with external network access
blocked, not the network behavior of the machine's injected security software.
No external request payloads were retained. Browser profiles, synthetic pixels,
downloads, and test reports remain local and ignored.

## Other validation

- Focused WebMCP unit tests: 3 files, 12 tests passed.
- `bun run check`: zero errors and zero warnings.
- `bun run lint`: passed (Prettier and ESLint).
- `bun run i18n:check` and `bun run lint:design`: passed.
- `openspec validate webmcp-selected-workflows --strict`: passed.
- Prettier on the three updated documentation files and `git diff --check`: passed.

The browser run used the development server. It verifies Chrome integration
and the normal image-to-pack flow; it does not add an Origin Trial deployment
or claim interoperability with other browsers.
