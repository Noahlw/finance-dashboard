# 01 — Operator access and safe annual setup

**What to build:** An active allowlisted Committee or Treasurer can enter the finance workspace safely, while unauthorized accounts receive no finance data. Setup can be repeated without destroying existing rows or files, and destructive reset is owner-only.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every finance and migration entry point enforces the active Users-sheet allowlist and role server-side.
- [ ] Unauthorized, inactive, Member, and missing accounts receive one minimal denial response and create an AUTH_DENIED audit record without finance payloads.
- [ ] Active Committee and Treasurer operators see only their permitted workspace controls.
- [ ] Repeated setup preserves existing rows, configuration, and Drive files.
- [ ] Destructive reset is unavailable to non-owners and has a separate owner-only path.
- [ ] Public APIs use one typed success/error envelope and no legacy Claim/Receipt write path remains callable.
- [ ] Backend, API-contract, access-denial, and setup regression tests pass.
