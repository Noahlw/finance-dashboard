# ADR 0002 — Treasurer-only approval, with self-dealing accepted and made transparent

**Status:** accepted (2026-07-04)

## Context

The design offered three approval models: any-committee-member-except-requester, treasurer-only, and dual-role sign-off. The fellowship chose **treasurer-only** for speed and simplicity. This creates a known control weakness: the treasurer historically fronts most expenses (per SEM A data), so the same person may request, approve, verify, and pay out their own item. The committee explicitly chose to **accept this risk** rather than route the treasurer's own items to a second approver.

## Decision

Treasurer-only approval stands, with mandatory zero-friction transparency instead of blocking:

1. The Engine never blocks self-approval, but always sets `self_approved = TRUE` on the affected row.
2. Every self-approval is posted to the private `#treasury` Discord channel at the moment it happens, visible to all committee members.
3. The semester statement includes a dedicated **"Self-approved items" annex**.

## Consequences

- Approval latency stays minimal (one approver, no routing rules).
- The audit posture changes from *prevention* to *disclosure*: an auditor (or any exco) can enumerate every self-approved item in seconds. Silent self-dealing is impossible; visible self-dealing is a social/governance matter, by design.
- This is the likeliest finding in a university spot audit. If the university objects, the reversal path is small: change the Engine's role check so self-items require any second committee member (the design's original recommendation) — a config-level change, not a schema change.
