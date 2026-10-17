## 1. PDF layout and rendering

- [x] 1.1 Add typed paper, orientation, margin, spacing, placement, and pagination contracts; implement deterministic aspect-preserving non-overlapping layout and focused tests. Verify with `cd web && bun run test -- src/lib/export/pdf-layout.test.ts`.
- [x] 1.2 Add local PDF generation with exact A4/US Letter page dimensions, transparent sticker embedding where supported, locale-neutral filenames, and focused output tests. Verify with `cd web && bun run test -- src/lib/export/pdf.test.ts`.

## 2. Preview and editing

- [x] 2.1 Add localized page preview, configuration controls, and PDF export action as a separate flow; preserve existing WhatsApp, Telegram, and static export behavior. Verify with `cd web && bun run check`.
- [x] 2.2 Add pointer and keyboard controls for selecting, moving, and resizing stickers while enforcing margins, aspect ratio, and collision constraints. Verify with `cd web && bun run test -- src/lib/components/PdfSheetExport.svelte.test.ts`.
- [x] 2.3 Add all new end-user messages to pt-BR, en, and es and check catalog parity. Verify with `cd web && bun run i18n:check`.

## 3. Verification and documentation

- [x] 3.1 Add meaningful regression coverage for the new export and confirm existing export tests remain unchanged and pass. Verify with `cd web && bun run test -- src/lib/export`.
- [x] 3.2 Update architecture documentation and run `cd web && bun run lint:design && bun run build`.
