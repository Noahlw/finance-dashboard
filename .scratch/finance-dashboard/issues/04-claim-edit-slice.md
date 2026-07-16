# 04 — The Claim Edit Slice

**What to build:** A student can edit an existing claim from their Dashboard. Build the `api_editClaim` backend endpoint (which verifies IDOR and strictly enforces that only `Submitted` claims can be edited) and the React Edit Form UI.

**Blocked by:** 03 — The Claim Submission Slice (with Refactoring)

**Status:** done

- [x] Build `api_editClaim` in `Api.js` that checks user authorization and claim status constraints.
- [x] Add "Edit" buttons to pending claims in the React Dashboard.
- [x] Build the React Edit Form UI (pre-populated with existing claim data).
- [x] Write Jest tests verifying that edits to `Reimbursed` claims are correctly rejected by the backend.
