# Legacy free-text eventId values are never backfilled; manual re-link only, and only where edit capability exists

Status: accepted

Today, `eventId` on Claim and Income records is an operator-typed free-text string with no backing record (`ClaimsView.tsx:53`, `FinanceAccountsView.tsx:476`). #59 locked full Event CRUD as pre-launch scope per ADR 0073 — real `Events` records, a list endpoint, and a picker UI replacing those free-text inputs on the *create* forms. #59 explicitly flagged, without deciding, what happens to *historical* rows whose free-text value has no corresponding Event record once that picker ships.

**Decision:**

1. No automatic migration or backfill is ever run. Fuzzy-matching free text to Event names was considered and rejected — the risk of a silently wrong match (attributing a Claim or Income record to the wrong Event) is a real financial-reporting integrity risk this project does not accept for convenience.
2. **Claims:** a Treasurer or the claimant may manually re-link an individual legacy Claim at their own discretion, at any time, with no forcing function and no deadline — but this requires new, explicitly ticketed scope. `api_editClaim` (`Api.js:539-592`) today updates only `total_amount` and `notes`; it does not touch `event_id`, so no edit-eventId path exists yet. [Issue #67](https://github.com/Noahlw/finance-dashboard/issues/67) is the concrete follow-on this policy depends on: extend `api_editClaim`'s payload and the Claim edit UI to accept and surface an `eventId` field via the same Event CRUD picker. Until #67 ships, Claims are effectively grandfather-only in practice, even though the policy intent is manual re-link.
3. **Income:** grandfather-only, permanently, with no re-link path. There is no `api_editIncome` endpoint at all today — Income only has record/confirm/reject/request-info, none of which permit editing an existing record's fields, `event_id` or otherwise. Building a general income-edit capability is a materially larger, separate decision (with its own audit/reversibility questions for confirmed income) than this ticket's scope, and is not bundled into #67 or any other ticket spawned here. If income editing is ever built for other reasons, extending it to cover `event_id` re-link would be a natural, low-cost addition at that time — but nothing is planned or promised.
4. Legacy rows with an unlinked free-text `eventId` remain fully valid and functional indefinitely, on both Claims and Income. They are never blocked, flagged, or force-migrated by any code path.

## Consequences

Historical Claim records with unlinked free-text `eventId` values can be re-linked by hand once #67 ships; historical Income records never can, without a new, separate income-edit feature decision. Neither is filterable/groupable by canonical Event until (if ever) manually re-linked. This is an accepted, permanent tradeoff for Income, and a temporary one for Claims pending #67.
