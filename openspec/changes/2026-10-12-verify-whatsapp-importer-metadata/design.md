# Importer Metadata Research

## Scope and decision

This investigation is limited to whether an existing importer consumes pack
title and author metadata. It does not change Rusticker's archive format. The
documented third-party `.wastickers` convention is a ZIP containing root-level
`title.txt`, `author.txt`, sticker WebP files, and a PNG cover. However, the
evidence located here is third-party documentation, not a current first-party
importer specification or a test against the installed application. Treat the
contract as a candidate, not as verified support. Do not implement the
dependent feature yet.

## Evidence

### Named third-party importer: Sticker Maker

- The archived [`laggykiller/wastickers_creater` repository](https://github.com/laggykiller/wastickers_creater) says its `.wastickers` output is a ZIP with `author.txt`, `title.txt`, sticker image files and a PNG cover, and instructs users to share that file with Sticker Maker before adding the pack to WhatsApp. The repository is archived and its README says it is no longer maintained. This documents an authoring/import workflow, but does not contain Sticker Maker's implementation or a test result.
- [`laggykiller/sticker-whatsapp-bridge`](https://github.com/laggykiller/sticker-whatsapp-bridge) independently labels `.wastickers` as the format exported by Sticker Maker and lists root `title.txt` and `author.txt` as pack title and author. It is a third-party converter, not the importer itself; its README does not pin a Sticker Maker app version.
- The [Google Play listing for Sticker maker by Viko & Co](https://play.google.com/store/apps/details?id=com.marsvard.stickermakerforwhatsapp), rechecked on October 16, 2026, identifies package `com.marsvard.stickermakerforwhatsapp` and shows an update date of September 17, 2026, but the listing does not expose an application version in the captured page. It describes creating and publishing packs, not importing `.wastickers` files.

Accordingly, an app name and package can be identified, but a reproducible
app-version result cannot be claimed. Confidence in the _documented convention_
is medium; confidence that a current Sticker Maker build recognizes both files
is low until a fixture is opened in a versioned app build.

### Official WhatsApp integration is a different contract

WhatsApp's [official Android sample documentation](https://github.com/WhatsApp/stickers/blob/main/Android/README.md)
defines pack `name` and `publisher` in `contents.json`, served with the sticker
files by an Android `ContentProvider`. Its
[official iOS sample documentation](https://github.com/WhatsApp/stickers/blob/main/iOS/README.md)
defines `name` and `publisher` in a JSON payload transferred through the
WhatsApp URL/pasteboard flow. These are native application integrations; the
documentation does not define raw ZIP import or `title.txt`/`author.txt` for
WhatsApp itself. This official contract therefore cannot validate Rusticker's
current browser-generated ZIP.

## Comparison with Rusticker output

Rusticker's current authoritative contract is
[`openspec/specs/sticker-export/spec.md`](../../specs/sticker-export/spec.md):
the ZIP contains numbered root WebP files, `tray_icon.png`, and PNG copies in
`png/`, with no other entries. It is named `rusticker-pack-<n>.zip`. That is
not the candidate `.wastickers` contract: Rusticker has no root-level
`title.txt` or `author.txt`, uses `tray_icon.png`, and includes extra PNG
copies in a subdirectory. No output format was changed during this research.

## Runtime verification status

The acceptance test requires opening a locally generated archive in a named,
versioned importer and observing the title and author shown in its preview or
imported pack. On October 16, 2026, the synthetic fixture was built and its
image constraints, ZIP layout, and metadata round-trip were checked locally.
See [runtime verification](runtime-verification.md) for the reproducible command,
observations, and device test procedure.

No accessible device or configured AVD could be established: `emulator.exe
-list-avds` returned no names, and `adb devices -l` failed before listing devices
because it could not create its Android user directory. This does not prove that
no physical device exists. No importer APK or WhatsApp instance was installed or
run, and no app-version-specific result is available. Tasks 3 and 4 remain open;
do not infer importer success from the fixture checks or repositories above.

## Recommendation

Keep the current archive contract unchanged. Before implementing the dependent
metadata issue, test a synthetic, non-user-data fixture containing at least
three valid 512x512 transparent WebP stickers, `tray.png` (96x96 PNG),
`title.txt`, and `author.txt` at the ZIP root in Sticker Maker for Android
(`com.marsvard.stickermakerforwhatsapp`) or another explicitly named importer.
Record the app's exact version, OS version, archive extension, file layout,
whether both values appear, and whether the pack can be added to WhatsApp. If
the app requires a particular extension or different file names, capture that
as part of the contract. Repeat on iOS only if cross-platform support is a
product requirement. Until then, treat the dependent metadata feature as
blocked rather than as a no-go or a verified capability.
