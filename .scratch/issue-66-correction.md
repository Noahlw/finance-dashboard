## Correction — the prior resolution's falsifiable claim was wrong

The previous resolution comment claimed "editing an existing Claim/Income record and selecting a canonical Event through that same picker is the re-link mechanism — it's a natural consequence of #59's already-scoped work, not an additional feature requiring its own ticket."

**That's false, verified directly against the code:**

- `api_editClaim` (`Api.js:539-592`) updates only `total_amount` and `notes` on SUBMITTED claims. It does not touch `event_id`. There is no existing path to edit a Claim's Event after submission.
- Income has **no edit endpoint at all** — `api_recordIncome`, `api_getPendingIncome`, `api_confirmIncome`, `api_rejectIncome`, `api_requestIncomeInfo` exist, but none permit editing an already-recorded Income record's fields, `event_id` or otherwise.

#59's Event CRUD scope covers the *create*-time picker only; it never claimed edit-time re-linking.

**Corrected policy, now in [ADR 0180](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0180-legacy-eventid-values-never-backfilled-manual-relink-only.md):**

- No automatic backfill, ever, for either Claims or Income (unchanged from the prior resolution).
- **Claims:** manual re-link is the intended policy, but it requires new scope, now ticketed as [#67](https://github.com/Noahlw/finance-dashboard/issues/67) (extend `api_editClaim` + edit UI to accept `eventId`). Until #67 ships, Claims are grandfather-only in practice.
- **Income:** grandfather-only, permanently, with no re-link path — building general income-edit capability (a materially larger decision, given confirmed-income audit/reversibility implications) is explicitly out of scope here.
- Legacy unlinked rows on both remain fully valid and functional indefinitely; never blocked or force-migrated.

Falsifiable claims corrected accordingly: (a) no backfill/migration script exists — still true; (b) a Claim's `event_id` can be re-linked via the edit UI — **not yet true, gated on #67**; (c) an Income record's `event_id` can be re-linked — **never true under this policy**, by design.

Closes #66.
