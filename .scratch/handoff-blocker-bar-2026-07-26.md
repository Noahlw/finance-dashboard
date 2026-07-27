# Wayfinder map #27 — COMPLETE, MAP CLOSED (verified, one correction landed mid-session)

Date: 2026-07-27
Status: **Map #27 closed. All grilling resolved. Handed to `/implement`.**

## What happened

Every `wayfinder:*` child ticket (#28, #29, #55, #56, #57, #58, #59, #64, #66) resolved and closed. 17 ADRs (0056-0180) capture the locked decisions. Map #27 closed per ADR 0175's closure criteria.

**One correction happened mid-session, worth knowing about if picking this up again:** #66 (eventId backfill policy) was closed once with a resolution claiming manual Claim/Income re-link was already possible via existing/already-scoped edit UI. That claim was false — verified directly against `Api.js`: `api_editClaim` never touches `event_id`, and Income has no edit endpoint at all. #66 was reopened, corrected (a superseding comment, not a silent edit — GitHub comments are immutable), and re-closed with [ADR 0180](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0180-legacy-eventid-values-never-backfilled-manual-relink-only.md): Claims get manual re-link once #67 ships, Income is permanently grandfather-only (no edit endpoint exists for it at all, and building one is out of scope here). Map #27 itself was briefly closed then reopened to absorb this correction before its final close.

## What's next (not resolved here — this is `/implement` scope)

- Pre-launch blocker bar from #55/#59 (still prose, not individually ticketed): P0 status fix, 9 `_requireOperator`/active-status auth-gap endpoints, Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports filters, Payout account selector, upload-hash race, `ClaimsView` draft-resume gap, Event CRUD.
- Already-created `ready-for-agent` tickets: #60, #61, #62, #63, #65, #67.
