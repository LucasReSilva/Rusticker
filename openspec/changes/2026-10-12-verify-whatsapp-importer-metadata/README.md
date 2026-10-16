# 2026-10-12-verify-whatsapp-importer-metadata

Evaluate whether named WhatsApp sticker importers recognize pack title and author metadata.

Status: 2/4 tasks complete. A synthetic fixture is reproducible locally; the
versioned importer test and resulting feature decision are still pending.
See [runtime verification](runtime-verification.md) for evidence and the device
procedure. Run the builder from the repository root on Windows with FFmpeg:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File openspec/changes/2026-10-12-verify-whatsapp-importer-metadata/build-fixture.ps1
```

`-ExecutionPolicy Bypass` applies only to that process; it does not change the
machine's policy. Output is written to the ignored `generated/` directory beside
the script. Do not commit generated images or archives.
