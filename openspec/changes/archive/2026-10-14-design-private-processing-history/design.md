## Context

See `proposal.md` for motivation and `specs/processing-history/spec.md` for the behavior contract. Rusticker currently processes images locally and has no processing-history persistence. Browser storage is origin-scoped and best-effort by default; browsers choose quotas and may evict site data. Storage estimates are not exact. The Web Crypto digest API supports SHA-256 in secure contexts and workers, but requires the complete input buffer in memory rather than streaming it.

## Goals / Non-Goals

**Goals:**
- Provide useful, opt-in continuity without retaining images or exports.
- Make duplicate recognition local and limited to exact file-byte matches.
- Keep history write failures independent from detection and export.
- Give users direct controls to delete a run or all history.

**Non-Goals:**
- Cross-device synchronization, cloud backup, session restoration, or access to prior sticker pixels and packs.
- Claim that a SHA-256 fingerprint anonymizes the source file or identifies visually equivalent images.
- Request persistent-storage permission or guarantee retention against browser eviction.

## Decisions

### Persist minimal metadata in IndexedDB

Use a same-origin IndexedDB database for run records because it supports asynchronous structured data and is intended for larger client-side datasets. Do not use `localStorage`: it is synchronous and string-only, and browser documentation describes a small fixed 5 MiB per-origin limit. Store one record per completed run with a random record ID, timestamp, source width/height, background color and tolerance, sticker count, and an optional 32-byte SHA-256 digest. Do not persist file names, paths, input bytes, canvas buffers, stickers, or ZIP output.

Alternatives considered:
- **Fingerprint-only list:** uses less storage but gives users little information about what they processed, so it does not meet the browsable-history need.
- **Store source or derived images:** permits restoring or re-exporting, but greatly increases sensitivity, storage use, and deletion complexity. Excluded from this change.
- **Session-only history:** avoids persistence concerns but does not let users revisit prior runs after closing the page. Rejected for this feature.

### Make history opt-in and bounded

Add one explicit history preference, off by default. Enabling it does not retroactively record previous runs. When enabled, record only successful completions. Keep the 50 newest records from the last 90 days; prune expired/excess rows on history access and before writes. Do not request `navigator.storage.persist()`: history is convenience data and should follow browser best-effort behavior. `navigator.storage.estimate()` may support a non-blocking storage explanation, but its numbers are estimates and must not be presented as a guarantee.

### Use exact-file SHA-256 only as a local matching key

When history is enabled, compute SHA-256 over the original selected `File` bytes in the browser. This detects byte-identical files only; files with different encodings or metadata may not match even if they render identically. `SubtleCrypto.digest()` is not streaming, so implementation must account for a complete in-memory copy and may skip the fingerprint when the file is too large or browser resources are constrained. Continue storing the summary if hashing is unavailable. Keep the digest out of UI, logs, telemetry, URLs, tool interfaces, and network requests. A digest of a known file can be guessed offline, so treat it as sensitive rather than anonymous.

Alternatives considered:
- **Hash decoded normalized pixels:** could identify visually equivalent images but adds a canonicalization contract, full pixel-buffer hashing, and potential large memory/CPU costs. Defer until users demonstrate a need.
- **Hash original bytes and display it:** makes support/debugging easier but exposes a stable identifier without user value. Rejected.

### Keep persistence failure outside the processing path

Place persistence behind an asynchronous adapter invoked after processing has produced a usable result. Catch database-open, transaction, quota, and serialization failures at that boundary. A failed write reports that history could not be saved and must not discard a result, block curation, or block ZIP export. Do not clear old entries to make room beyond ordinary age/count pruning; the user can manually clear history.

### Keep deletion and retention explicit

History entries are summaries, not restorable jobs. Delete one row by its random record ID; clear-all deletes the history object store and any associated preference state only when the user confirms. Disabling the preference stops future writes and asks whether to retain or clear existing rows. Retention pruning is deterministic and occurs when the app next opens or writes history; browser eviction can remove the entire origin's best-effort data at any time.

### Localize all user-facing UI

Add preference, explanation, empty state, history list, delete/clear confirmation, storage failure, and duplicate-file indicators to all existing Paraglide locales (`pt-BR`, `en`, `es`). Reuse existing design-system components and theme tokens. Do not hardcode text in Svelte components.

## Risks / Trade-offs

- **[A digest may be correlatable with a known image]** → Keep it local and invisible, never upload it, and explain that it is a matching key rather than anonymization.
- **[Browser quota and eviction vary]** → Bound the database, treat estimates as advisory, surface write failure, and keep processing independent.
- **[SHA-256 buffers the complete file]** → Skip digest calculation when capability or memory is insufficient; summary history still works.
- **[Users may expect re-export from history]** → State in the history view that selecting the source image again is required; image/output retention is explicitly out of scope.
- **[Browser clearing data removes history]** → Describe history as best-effort local convenience, not durable backup.

## Migration Plan

There is no existing history database to migrate. Create the database lazily only after the user enables history. Rollback removes the feature and its database; the application must never migrate records to a server. A future schema version must preserve the same local-only policy and handle database upgrades without blocking ordinary image processing.

## References

- MDN, [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): asynchronous structured client-side storage, including files and blobs.
- MDN, [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): quota policy varies by browser, storage is best-effort by default, writes can fail with `QuotaExceededError`, and `estimate()` is approximate.
- WHATWG, [Storage Standard](https://storage.spec.whatwg.org/): normative storage model, quota estimates, and persistence model.
- MDN, [SubtleCrypto.digest()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest): SHA-256 availability and requirement that digest input is fully buffered (no streaming).
