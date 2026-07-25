# 05 — Resumable Annual Migration

**What to build:** A Treasurer can create and resume a staged annual migration, select the reference data and opening balances to carry forward, validate the target, and activate it safely with rollback and health checks.

**Blocked by:** 01 — Operator access and safe annual setup.

**Status:** ready-for-agent

- [ ] The wizard uses exactly PREVIEW -> MEMBERS -> ACCOUNTS -> EVENTS -> CATEGORIES -> USERS -> VALIDATE -> ACTIVATE.
- [ ] Staging creates a new year folder, annual spreadsheet, Receipt folder, Payment QR Code folder, and Export folder.
- [ ] One annual spreadsheet contains SEM A, SEM B, and SUMMER.
- [ ] Stage, selections, target IDs, and audit actor persist so an active Treasurer can resume after browser closure.
- [ ] Members, Accounts, Events, Categories, and active operators can be selected; Member rows are not promoted to operators.
- [ ] Opening balances require Treasurer confirmation and reasons; finance history is never copied.
- [ ] Validation blocks invalid targets and reports all errors before activation.
- [ ] Activation requires explicit Treasurer action, is idempotent, snapshots the source, switches the active pointer safely, shares active operators, and makes the prior file read-only/viewable.
- [ ] Health-check failure restores the previous active pointer without deleting source or target files.
- [ ] Migration, resume, selection, rollback, and staging-browser tests pass.
