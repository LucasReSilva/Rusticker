## 1. Local history persistence

- [ ] 1.1 Implement an opt-in preference and a same-origin IndexedDB adapter that stores only the specified processing summary and optional exact-file SHA-256 fingerprint.
- [ ] 1.2 Add schema versioning, retention pruning (90 days, maximum 50 entries), safe per-entry deletion, and confirmed clear-all behavior.
- [ ] 1.3 Ensure storage-open, hashing, serialization, transaction, quota, and eviction failures cannot block detection, curation, or export.
- [ ] 1.4 Verify no history value enters fetch/XHR requests, analytics, logs, crash reporting, URLs, or tool interfaces.

## 2. User controls and history view

- [ ] 2.1 Add the opt-in setting and explain stored fields, local-only handling, browser eviction, and that source/output images are not retained.
- [ ] 2.2 Add a localized history view showing newest-first summaries and exact-file duplicate indication without exposing the fingerprint or original file name.
- [ ] 2.3 Add per-entry deletion, clear-all confirmation, and disable-history flow with an explicit keep-or-clear choice.
- [ ] 2.4 Add all user-facing strings to `pt-BR`, `en`, and `es` message catalogs and use design-system components and theme tokens.

## 3. Validation

- [ ] 3.1 Test default-off behavior, enabling without retroactive records, successful record creation, exact-file match, and unavailable digest behavior.
- [ ] 3.2 Test newest-first ordering, 90-day and 50-entry retention, deleting one entry, and clear-all.
- [ ] 3.3 Test unavailable storage and quota errors while confirming results remain exportable and existing history is preserved.
- [ ] 3.4 Verify all three locale catalogs, privacy/network assertions, relevant web tests, and the production build.
