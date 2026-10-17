# Tasks

- [x] 1. Review WhatsApp's official Android and iOS pack metadata contracts and compare them with Rusticker's current archive specification.
- [x] 2. Identify a named third-party importer workflow and record the `.wastickers` title/author file convention, source freshness, and confidence limits.
- [ ] 3. Build a synthetic valid archive and open it in a named importer build with an exact app version; record whether title and author are recognized and the exact accepted extension/layout.
- [ ] 4. Based on the runtime result, unblock or close the dependent metadata feature with the evidence and update the product specification only if a stable contract is demonstrated.

## Verification update: 2026-10-16

Task 3 is partially prepared, not complete. The [synthetic fixture builder](build-fixture.ps1)
creates and checks three transparent 512x512 WebPs, a transparent 96x96 PNG,
and UTF-8 title/author files in a flat ZIP. Its `.zip` and `.wastickers` copies
contain identical bytes. Generated images and archives are ignored and stay local.

The [runtime verification record](runtime-verification.md) captures local results
and the remaining device procedure. No configured AVD or accessible Android
runtime was established, so an exact importer version, accepted extension/layout,
metadata recognition, and WhatsApp handoff are still unverified. Task 4 and the
dependent metadata feature remain blocked on that runtime result; the product
specification remains unchanged.
