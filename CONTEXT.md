# CONTEXT.md — Glossary

Canonical language for the CF fellowship finance system. Code identifiers, Discord messages, and docs must use these terms exactly.

| Term | Meaning |
|---|---|
| **Owner account** | The shared Google account that *owns* CF-Ledger, CF-Vault, the Apps Script project, and the AppSheet app. It is the institution, not a person; it survives yearly committee handover. Nobody "acts as" it in workflows. |
| **Actor account** | A committee member's personal Google account, used to log into AppSheet and attributed on every action they take. |
| **Engine** | The Apps Script code that is the sole mutator of status and audit data. Humans express intent; the Engine performs transitions. |
| **Intent column** | An editable column (ACTION / AMOUNT_OVERRIDE / NOTE / CONFIRM) where a human expresses what they want done. The Engine reads it, acts, and clears it. Humans never edit status columns directly. |
| **BudgetRequest** | A pre-spend ask: "may we spend?" Contains one or more BudgetRequestLines. Approved by the Treasurer only. |
| **BudgetRequestLine** | One category-level line of a BudgetRequest. Approved lines *are* the budget; their `remaining` gates claims. |
| **ExpenseClaim** | A post-spend ask: "pay me back." Contains ClaimLineItems; verified by any committee member, paid out by the Treasurer. |
| **ClaimLineItem** | The atom linking money to authority: one portion of one Receipt charged to one BudgetRequestLine. |
| **Receipt** | An image/PDF in the restricted Drive folder, identified by Drive file ID and SHA-256 hash. Distinct from the claim that references it. |
| **Payout** | One transfer of money to one payee for one claim (FPS / PayMe / bank / cash). A claim may have several. |
| **Self-approved item** | A request or claim where the approver/verifier is also the requester/claimant (in practice: the Treasurer). Permitted, but always flagged, announced in #treasury, and listed in the semester statement annex. Never silent. |
| **Opening balance** | The single Income row (Retained Earnings, HK$10,167.35) that seeds the new ledger. The old `SEM A Statement.xlsx`, archived in Drive, remains the authority for everything before it. |
| **Treasurer** | The single role with authority to approve budget requests and payouts (currently USER-0001). |
| **Semester** | The fiscal period (e.g. `26A`). IDs embed it; `closeSemester()` freezes it. |
| **Locked** | Terminal claim state: rows are protected and the Engine refuses all writes. Corrections after lock are reversing entries, never edits. |
| **AuditLog** | Append-only, hash-chained record of every mutation. Written only by the Engine; verified by `verifyChain()`. |
