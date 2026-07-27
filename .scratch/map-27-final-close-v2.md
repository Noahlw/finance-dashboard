## Destination

A fully code-managed, responsive React/Vite web app served by Google Apps Script HTML Service for phone and PC. It replaces AppSheet as the user-facing UI; no AppSheet editor or configuration is required. It preserves Google Sheets, Drive, and the existing finance-domain logic, including receipt-photo upload from the UI.

**Status: CLOSED.** All decisions locked per [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md)'s closure condition. See the closing comment for the full account.

## Notes

- Domain: university club finance system (budget requests, expense claims, payouts, income, semester close).
- AppSheet is fully out of scope and fully retired (verified in #57's reconciliation). Google Sheets remains the data/reporting system; the web UI is the operational interface.
- Jul 26 audit is the ground truth for remaining defects; the durable spec lives at `docs/specs/committee-finance-web-app.md`.

## Decisions locked (final)

- [#28](https://github.com/Noahlw/finance-dashboard/issues/28) — Web UI workflow parity and offline expectations: mobile-first, online-only.
- [#29](https://github.com/Noahlw/finance-dashboard/issues/29) — Google identity and authorization: `executeAs: USER_ACCESSING`, `Users` allowlist.
- [#55](https://github.com/Noahlw/finance-dashboard/issues/55) — Production blocker bar: mandatory pre-launch defects and deferred-post-launch defects, both fully enumerated.
- [#56](https://github.com/Noahlw/finance-dashboard/issues/56) / [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md) — Map closure criteria: decisions locked + clean tracker, not fixes merged.
- [#57](https://github.com/Noahlw/finance-dashboard/issues/57) — All 24 stale tickets (#29-#54) reconciled: closed-with-resolution or replaced by fresh `/implement`-ready tickets (#60-#63).
- [#58](https://github.com/Noahlw/finance-dashboard/issues/58) / [ADR 0176](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0176-schema-migration-canonicalizes-by-numeric-column-index.md)/[0177](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0177-schema-migration-rollback-recomputes-derived-state.md)/[0178](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0178-schema-migration-go-live-gate-and-release-invariant.md) — Schema migration and upgrade safety policy, Phase 0 (go-live gate) and Phase 1 (full runner, tracked as [#65](https://github.com/Noahlw/finance-dashboard/issues/65)).
- [#59](https://github.com/Noahlw/finance-dashboard/issues/59) — Missed audit blockers: P0-A/P0-B pre-launch, Event CRUD scope, staging checklist ownership (Treasurer).
- [#64](https://github.com/Noahlw/finance-dashboard/issues/64) / [ADR 0179](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0179-initial-go-live-approval-is-owner-gated-checklist-evidenced.md) — Go-live approval: spreadsheet owner, evidenced by staging `clasp deploy` ID + Web App URL in the checklist, recorded as a future comment on #64, one-time gate.
- [#66](https://github.com/Noahlw/finance-dashboard/issues/66) / [ADR 0180](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0180-legacy-eventid-values-never-backfilled-manual-relink-only.md) — Legacy free-text `eventId` values: never auto-backfilled. Claims may be manually re-linked once [#67](https://github.com/Noahlw/finance-dashboard/issues/67) ships; Income has no edit endpoint at all and is grandfather-only permanently.

## Handed to /implement

These are concrete fixes and tracking gaps, not open map decisions — they do not gate this map's closure per ADR 0175's own boundary ("does not gate closure: the actual code fixes... landing in `/implement`").

- Pre-launch blocker bar from #55/#59 (P0 status fix, 9 `_requireOperator`/active-status auth gaps, Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports filters, Payout account selector, P0-A upload race, P0-B draft-resume gap, Event CRUD).
- [#60](https://github.com/Noahlw/finance-dashboard/issues/60), [#61](https://github.com/Noahlw/finance-dashboard/issues/61), [#62](https://github.com/Noahlw/finance-dashboard/issues/62), [#63](https://github.com/Noahlw/finance-dashboard/issues/63), [#65](https://github.com/Noahlw/finance-dashboard/issues/65), [#67](https://github.com/Noahlw/finance-dashboard/issues/67) — already-created `ready-for-agent` tickets.
- Not yet ticketed: the full 9-endpoint auth-gap inventory as individual acceptance criteria.
- Deferred post-launch (per #55): semester config key mismatch, committee-year counter freeze, `closeSemester`'s closed-period lock.

## Out of scope

- AppSheet app/editor configuration, AppSheet views, slices, bots, and AppSheet-specific UI behavior.
- Next.js, Vercel, external hosting, or a native mobile application.
- Reintroducing Google Forms as a user-facing intake flow.
