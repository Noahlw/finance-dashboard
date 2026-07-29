# ADR 0001 — Shared owner account, personal actor accounts

**Status:** accepted (2026-07-04)

## Context

The committee originally planned for all members to share one Google account, since AppSheet's free tier limits an app to 10 users. The committee rotates annually (≤10 people at any time). A shared login would make every audit entry attributable only to "the committee" — `verified_by`, `decided_by`, and self-approval detection would all be meaningless, which defeats the system's core purpose (university-audit-grade traceability).

## Decision

- The shared account is the **Owner account**: it owns CF-Ledger, CF-Vault, the Apps Script project, and the AppSheet app. It represents the institution and survives handover; nobody performs workflow actions as it (Phase 1's Approvals-tab interim, run from the owner account, attributes to the Treasurer explicitly and is logged as such).
- Committee members use **personal Google accounts** as AppSheet users. The 10-user cap is concurrent, not lifetime: at yearly rotation, outgoing emails are removed and incoming ones added; `Users` rows are deactivated, never deleted, so historical FKs resolve forever.

## Consequences

- Every ledger action is signed by a real human (`USEREMAIL()` → `intent_actor_email` → USER-id).
- Handover = swap AppSheet user list + rotate owner-account password (see `docs/handover.md`).
- Mid-year departures are revoked individually without rotating a shared secret.
- Cost: exco must each have a Google account and be added/removed at rotation (~10 min/year).
