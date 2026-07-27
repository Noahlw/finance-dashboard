Part of #27
Cross-linked: #55 (closed without classifying these)

## Context

#55 (Grilling: Which audit defects are production blockers?) resolved and closed the primary blocker bar, but its closing comment did not classify every item from the original audit question. A CEO-review blind-spot pass (reviewer sub-agent) independently surfaced a new P0 not present in the original audit at all. This ticket captures everything #55 left unclassified plus the newly discovered defect, so nothing falls through before go-live.

## P0 — must fix before go-live

### P0-A: api_uploadReceipt hash check-then-append race (Api.js:197-262)

The duplicate-receipt hash scan is not wrapped in the same lock as Audit.append. Two concurrent uploads with the same file hash from different users both pass the "does this hash already exist" check before either write lands, producing duplicate receipt rows for what should be a single deduplicated upload. This is concrete data corruption under real concurrent use (multiple committee members uploading receipts around the same time), not a theoretical edge case.

Fix direction: move the hash existence check inside the same LockService lock scope used for Ids allocation, so check-then-append is atomic.

### P0-B: ClaimsView has no draft-resume UI (src/frontend/src/ClaimsView.tsx)

draftId state (ClaimsView.tsx:63) is populated only within the live session that calls saveClaimDraft — it is never restored from getMyClaims() on mount. The claims list renders DRAFT-status claims as read-only table rows with no click-to-edit affordance (ClaimsView.tsx:824+). A Treasurer who saves a draft, then closes the tab, reloads, or navigates away, has no way to reopen that draft — it's stranded in the sheet with no UI path back to it. This is a live-data-loss UX gap tied to the same "full operator-facing workspace" bar #55 already put in scope for Reduce/Close and Discord retry.

Fix direction: on getMyClaims() load, surface DRAFT-status claims with a "Resume" action that re-opens the multi-step form pre-populated with the draft's saved fields and draftId.

## Classify — from #55's original question, not addressed in the resolution

### Event picker

eventId is a free-text input in both ClaimsView.tsx:53 and FinanceAccountsView.tsx:476 — there is no backing Events entity or dropdown; operators type an arbitrary string. The original audit flagged "Event picker" under Partial UI gaps. Decide: build a real picker backed by a canonical events list (pre-launch), or explicitly defer with a documented reason (post-launch, since free-text still functions for record-keeping even if not ideal).

### Staging evidence checklist

docs/staging-release-evidence-checklist.md exists but every item is unchecked. This is a release gate, not a code defect, but #55 never assigned it an owner or a deadline distinct from "must happen before go-live." Per CEO-review blind-spot findings, the checklist as written is also thin — it should require a manifest with record counts and checksums, ledger pointer verification, audit chain verification (Audit.verifyChain), and protection/formula validation, not just checkboxes.

## Decision needed

1. Are P0-A and P0-B pre-launch blockers (same bar as #55's confirmed list) or do they get a documented exception? Recommend: pre-launch, same bar — both are live-data-integrity issues under the "full operator-facing workspace" requirement.
2. Event picker: pre-launch real picker, or post-launch with free-text accepted as an interim state?
3. Who owns filling the staging evidence checklist, and does it gate production deployment, or run in parallel with the last pre-launch fixes?

The answer here is a written decision, matching #55's pattern — not the fixes themselves. Once decided, hand concrete fixes to the implementation flow as fresh tickets.
