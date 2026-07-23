# 06 — Mobile accessibility and staging release gate

**What to build:** The completed finance workspace is usable on the main mobile platforms and desktop browsers, with accessible recovery and dashboard navigation, and PR #47 has reproducible staging evidence for every critical finance and migration journey.

**Blocked by:** 02 — Draft-first Claim submission; 03 — Approval, Payout, and Movement Ledger; 04 — Reconciliation and Discord recovery; 05 — Resumable Annual Migration.

**Status:** ready-for-agent

- [ ] Dashboard views switch by swipe left/right and remain reachable through visible buttons and keyboard controls.
- [ ] Forms and dialogs have semantic controls, labels, headings, focus management, useful loading/error/empty states, and no native alert/confirm dialogs.
- [ ] Changed production files contain no new var, console.log, debugger, unsafe any/Function, or unhandled promise-chain violations; the existing baseline is documented where unrelated.
- [ ] Mobile and desktop staging journeys cover Claim Draft -> correction -> retry -> submit, payment/Receipt variants, approval, full/partial/failed Payout, reconciliation, Discord retry, migration resume, validation failure, activation, rollback, and health-check failure.
- [ ] Backend tests, frontend build, changed-file quality checks, generated artifact verification, screenshots, and staging evidence are attached.
- [ ] Tests use dedicated non-production Sheets, Drive folders, Script Properties, and deployments.
