# 02 — Draft-first Claim submission

**What to build:** A Committee Operator can record a complete Claim on mobile or desktop, save it as a private Draft, resume it, and submit it atomically with optional Receipts and the selected payment details. Errors preserve the Draft and local files and can be retried safely.

**Blocked by:** 01 — Operator access and safe annual setup.

**Status:** ready-for-agent

- [ ] A Claim requires an active eight-digit SID; claimant name remains optional.
- [ ] The same Draft identity and stable idempotency key are reused across saves and retries.
- [ ] Receipt upload is optional; multiple images/PDFs up to 5 MB work with mobile camera/file selection.
- [ ] PayMe QR files are stored separately from purchase Receipts and are not lossy-rewritten.
- [ ] Payment validation supports only FPS, PAYME, and OTHER with their approved conditional fields.
- [ ] Final submission requires one approved Budget Line; over-budget/unavailable lines remain selectable with warnings.
- [ ] Failed validation or persistence preserves values/files, shows an accessible correction dialog, and creates no duplicate Claim or orphaned file.
- [ ] Claim, file, API-contract, mobile-browser, and retry/idempotency tests pass.
