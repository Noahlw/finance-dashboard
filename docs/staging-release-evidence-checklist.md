# Staging release evidence checklist

Complete this checklist against the dedicated staging Apps Script deployment
before promoting a version to production. Attach screenshots, record IDs, and
the test date/reviewer beside each item.

## Deployment identity

- [ ] Staging `clasp deploy` deployment ID recorded: ______
- [ ] Staging public Web App URL recorded: ______

These two values, once this checklist is otherwise fully checked off, are the
evidence a spreadsheet-owner go-live approval is recorded against (ADR 0179,
one-time initial cutover gate only). No git commit SHA or clean-worktree
verification is required; this evidence proves a specific Apps Script
deployment was live and checklist-verified, not which exact commit built it.

## Environment isolation

- [ ] Staging `.clasp` configuration points to the staging Apps Script project.
- [ ] `LEDGER_ID` points to the dedicated staging Google Sheet, not production.
- [ ] Receipt, Payment QR Code, Export, snapshot, and migration folder IDs point
      to dedicated staging Drive folders.
- [ ] Script Properties were inspected for production spreadsheet, folder, and
      webhook IDs; none are present.
- [ ] Test records use synthetic Claimant data and a staging-only Discord
      webhook/channel.

Automated Jest tests use in-memory mocks for Sheets, Drive, and Script
Properties. Browser and manual evidence must use the isolated resources above;
tests must never target production IDs.

## Operator journeys

- [ ] Claim Draft → validation correction → retry → submit.
- [ ] Claim with no Receipt, one Receipt, multiple Receipts, and Receipt Total
      warning.
- [ ] FPS, PayMe phone, PayMe Payment QR Code, and OTHER payment details.
- [ ] Claim verification, Needs Info correction/resubmit, approval, and reject.
- [ ] Full, partial, and failed Payout; failed Payout retry and completion.
- [ ] Finance Account reconciliation, adjustment, and transfer.
- [ ] Failed Discord notification and successful retry.

## Annual Migration

- [ ] Start migration and verify the year folder, annual spreadsheet, Receipt,
      Payment QR Code, and Export folders.
- [ ] Close the browser during each selection stage and verify stage,
      selections, target IDs, source ID, and audit actor resume correctly.
- [ ] Verify invalid member/account/event/category/operator targets are all
      reported together and activation remains blocked.
- [ ] Verify every selected opening balance requires a Treasurer confirmation
      and reason.
- [ ] Activate explicitly; repeat activation and verify it is idempotent.
- [ ] Verify source snapshot, operator sharing, active pointer switch, and
      viewable read-only prior annual spreadsheet.
- [ ] Simulate target health-check failure; verify the previous pointer is
      restored and neither source nor target files are deleted.

## Schema Migration

Applies only once the versioned migration runner (ADR 0178 Phase 1) has
shipped and a schema migration is part of this staging pass, not required
for a release that only carries the `setupAll()` guards (ADR 0176/0177/0178
Phase 0).

- [ ] Migration completed with a manifest appended to `AUDIT_LOG`: migration
      ID, before/after `SCHEMA_VERSION`, per-tab final fingerprints, and row
      counts.
- [ ] `Audit.verifyChain()` reports clean immediately after the migration.
- [ ] Simulate a mid-migration failure; verify rollback restores `DATA_MOVE`
      steps from their journaled snapshot and re-derives `DERIVED_REAPPLY`
      steps (formulas, protections, validations) rather than restoring a
      stale snapshot of them.

## Release gate

- [ ] `npm test`
- [ ] `cd src/frontend && npm run build`
- [ ] Manual pass on mobile Safari (iOS), mobile Chrome (Android), and a
      desktop browser, each covering the Operator journeys above.
- [ ] Mobile swipe, visible navigation buttons, and Alt+Left/Alt+Right keyboard
      navigation reach every allowed workspace view.
- [ ] Keyboard-only dialog test: focus enters dialog, Escape/cancel works, and
      focus returns to the triggering control.
- [ ] No native `alert()` or `confirm()` calls remain under `src/frontend`.
- [ ] Record unrelated pre-existing lint/type-safety baseline findings here:
      repository-wide `npm run check` currently reports 5,938 legacy
      diagnostics (including GAS globals/`var`, filename conventions, and Jest
      globals). The release gate for changed frontend files is the TypeScript
      production build plus a focused diff review until that baseline is
      remediated.
