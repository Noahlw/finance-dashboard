## Grilling resolution: eventId backfill policy

First, correcting the ticket's own framing: options 1 ("grandfather, no backfill") and 4 ("never enforce retroactively") as originally written are not materially distinct — both leave legacy free-text data untouched forever with no difference in outcome. Neither is actually what got locked; the confirmed answer is a specific hybrid not literally any of the four listed options.

**Locked policy:**

1. **No automatic migration or backfill, ever.** No fuzzy-matching engineering effort (option 2, rejected — real risk of silently mis-linking a Claim to the wrong Event, unacceptable for financial data) and no forced re-linking sweep. This is permanent, not a temporary deferral awaiting future tooling.
2. **A Treasurer may manually re-link an individual legacy row at their own discretion, at any time.** Critically, this requires **no new engineering scope**: #59 already locked Event CRUD's full picker UI, which will back the `eventId` field on both create *and* edit. Editing an existing Claim/Income record and picking a canonical Event through that same picker *is* the re-link mechanism — it's a natural consequence of #59's already-scoped work, not an additional feature requiring its own ticket.
3. **Legacy rows with an unlinked free-text `eventId` remain fully valid and functional indefinitely.** They are never blocked, flagged, or force-migrated. The tradeoff accepted: historical Claim/Income records with unlinked values can't be filtered/grouped by canonical Event unless a Treasurer chooses to re-link them by hand.

Falsifiable: a later session can confirm (a) no backfill/migration script exists anywhere in the codebase, (b) editing an existing Claim/Income record's Event field through the picker UI successfully repoints a previously free-text `eventId` to a real `event_id`, (c) no legacy row is ever blocked or flagged for lacking a canonical link.

**No new `/implement` ticket needed** — this policy adds zero scope beyond what #59 already locked for Event CRUD.

Closes #66.
