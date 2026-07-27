Part of #27
Cross-linked: #66 (ADR 0180)

## What to build

`api_editClaim` (Api.js:539-592) currently updates only `total_amount` and `notes` on SUBMITTED claims. It never touches `event_id`, so there is no existing path to re-link an already-submitted Claim's Event after the fact. This ticket is the concrete backend/frontend scope ADR 0180's "manual re-link" policy actually depends on for Claims.

## Acceptance criteria

- [ ] `api_editClaim`'s payload accepts an optional `eventId`; when present, the claim's `event_id` column is updated alongside amount/notes, within the same existing authorization/status checks (claimant-owned, SUBMITTED status only — no change to who can edit or when).
- [ ] `EditClaimPayload` (types.ts) gains an optional `eventId` field.
- [ ] The Claim edit UI surfaces the Event CRUD picker (from #59/ADR 0073) on the edit form, pre-populated with the claim's current `event_id` (or empty, for legacy free-text values that don't match any real Event).
- [ ] `Audit.append` for the edit action records the eventId change when it occurs.

## Out of scope

- Income records. There is no `api_editIncome` endpoint at all today (Income only has record/confirm/reject/request-info) — building general income-edit capability is a separate, larger decision than this ticket, not bundled in here. Per ADR 0180, legacy Income `eventId` values remain grandfathered with no re-link path until/unless a future ticket decides to build income editing generally.
- Editing any other Claim field beyond what `api_editClaim` already permits (amount, notes) plus this new `eventId` field.
