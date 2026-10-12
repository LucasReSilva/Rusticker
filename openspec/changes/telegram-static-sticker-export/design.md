## Design

The new exporter accepts the current sticker selection and an explicit PNG or WEBP choice. Detected sticker images are already 512×512 RGBA; encoding them at that size meets Telegram's static image dimension rule while preserving the transparent pixels. Each image is named deterministically with a locale-neutral, zero-padded index and placed at the ZIP root. The archive is named `rusticker-telegram-stickers.zip` and contains image files only.

The standalone component owns only Telegram export controls, progress, localized handoff instructions, and an error/success notification. It does not edit or reuse WhatsApp export state. Keep its root page integration as a narrow handoff so it can be coordinated with the concurrent issue #46 mode controls; the parent agent will wire it into the current batch sticker state.

PNG is lossless. WEBP is encoded by the browser's local canvas encoder and must retain alpha. Encoding and ZIP creation remain on-device. No Telegram API, network upload, manifest, tray icon, title/author metadata, or native-set claim is introduced.

## Failure handling

An empty selection disables export. Unsupported WEBP encoding or any encoding/archive failure results in a localized error and leaves the component usable for retry. Progress advances as each image is encoded and the archive is generated.
