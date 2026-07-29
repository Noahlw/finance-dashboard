## Semesters & Annual Migration

This domain covers semester configuration, semester close, and annual migration.

### Key decisions

- Three semesters per year: SEM A, SEM B, SUMMER
- Semester dates are configured in the annual spreadsheet
- Semester is suggested from expense date
- Out-of-range expenses use current semester
- Committee can correct semester assignment
- Future expense dates are allowed
- Semester close is Treasurer-only, deletes private drafts, locks period
- Annual migration is resumable, copies users and balances forward
- Migration requires an active Treasurer
- Abandoned migration stays resumable


### Source ADRs (39)

| # | Title |
|---|-------|
| 0050 | [Semester close is Treasurer-only](docs/archive/adr/from-docs-adr/0050-treasurer-only-semester-close.md) |
| 0051 | [Unresolved finance work blocks Semester Close](docs/archive/adr/from-docs-adr/0051-semester-close-blockers.md) |
| 0069 | [Drafts save at explicit workflow boundaries](docs/archive/adr/from-docs-adr/0069-step-based-draft-saving.md) |
| 0093 | [Semester Close provisions the next Drive location](docs/archive/adr/from-docs-adr/0093-year-folder-and-next-semester-file-provisioning.md) |
| 0094 | [One spreadsheet covers an academic year](docs/archive/adr/from-docs-adr/0094-one-annual-spreadsheet.md) |
| 0095 | [Each academic year has three semester periods](docs/archive/adr/from-docs-adr/0095-three-semester-periods-per-year.md) |
| 0096 | [Semester Close follows a three-period sequence](docs/archive/adr/from-docs-adr/0096-semester-sequence-and-annual-rollover.md) |
| 0097 | [Annual rollover uses an interactive Treasurer migration wiza](docs/archive/adr/from-docs-adr/0097-interactive-annual-migration-wizard.md) |
| 0105 | [Annual member migration preserves identity and history](docs/archive/adr/from-docs-adr/0105-annual-member-migration-preserves-history.md) |
| 0107 | [Annual migration preselects active Finance Accounts](docs/archive/adr/from-docs-adr/0107-annual-migration-preselects-accounts.md) |
| 0108 | [Annual Migration activates only after Treasurer confirmation](docs/archive/adr/from-docs-adr/0108-staged-annual-migration-activation.md) |
| 0109 | [Annual Migration copies reviewed reference data](docs/archive/adr/from-docs-adr/0109-copy-reference-data-during-annual-migration.md) |
| 0110 | [Annual Migration selectively carries Events forward](docs/archive/adr/from-docs-adr/0110-selective-event-carry-forward.md) |
| 0111 | [Carried Events become new annual records](docs/archive/adr/from-docs-adr/0111-carried-events-get-new-annual-records.md) |
| 0112 | [Carried Finance Accounts get new annual records](docs/archive/adr/from-docs-adr/0112-carried-accounts-get-new-annual-records.md) |
| 0113 | [Carried Categories get new annual records](docs/archive/adr/from-docs-adr/0113-carried-categories-get-new-annual-records.md) |
| 0115 | [Annual migration keeps member identity data unchanged](docs/archive/adr/from-docs-adr/0115-annual-member-name-updates.md) |
| 0116 | [Event carry-forward excludes finance history](docs/archive/adr/from-docs-adr/0116-event-carry-forward-excludes-finance-history.md) |
| 0122 | [Annual folder names include the committee year](docs/archive/adr/from-docs-adr/0122-annual-folder-names-include-committee-year.md) |
| 0123 | [Annual folders contain dedicated file folders](docs/archive/adr/from-docs-adr/0123-annual-folder-contains-dedicated-file-folders.md) |
| 0124 | [Abandoned migration staging stays resumable](docs/archive/adr/from-docs-adr/0124-abandoned-migration-stays-resumable.md) |
| 0126 | [Annual spreadsheet naming matches its folder](docs/archive/adr/from-docs-adr/0126-annual-spreadsheet-naming-matches-folder.md) |
| 0127 | [Annual folders use a configured Drive parent](docs/archive/adr/from-docs-adr/0127-annual-folders-use-configured-parent.md) |
| 0128 | [Closed annual files are read-only](docs/archive/adr/from-docs-adr/0128-closed-annual-files-are-read-only.md) |
| 0129 | [New annual files start from a fresh schema](docs/archive/adr/from-docs-adr/0129-new-annual-file-starts-from-fresh-schema.md) |
| 0130 | [Annual Migration copies Users rows](docs/archive/adr/from-docs-adr/0130-annual-migration-copies-users-rows.md) |
| 0131 | [Migration requires an active Treasurer](docs/archive/adr/from-docs-adr/0131-migration-requires-an-active-treasurer.md) |
| 0133 | [Migration does not change roles](docs/archive/adr/from-docs-adr/0133-migration-does-not-change-roles.md) |
| 0134 | [Migration validates Treasurer access before activation](docs/archive/adr/from-docs-adr/0134-migration-validates-treasurer-access.md) |
| 0137 | [Carried accounts can be renamed per year](docs/archive/adr/from-docs-adr/0137-carried-accounts-can-be-renamed.md) |
| 0139 | [Non-carried accounts remain historical references](docs/archive/adr/from-docs-adr/0139-non-carried-accounts-remain-historical-references.md) |
| 0143 | [Semester Close deletes private drafts](docs/archive/adr/from-docs-adr/0143-semester-close-deletes-private-drafts.md) |
| 0144 | [Semester Close locks period data](docs/archive/adr/from-docs-adr/0144-semester-close-locks-period-data.md) |
| 0145 | [Semester dates are Treasurer-configured](docs/archive/adr/from-docs-adr/0145-semester-dates-are-configured.md) |
| 0146 | [Semester is assigned from Expense Date](docs/archive/adr/from-docs-adr/0146-semester-is-suggested-from-expense-date.md) |
| 0148 | [Committee can correct Semester assignment](docs/archive/adr/from-docs-adr/0148-committee-can-correct-semester-assignment.md) |
| 0176 | [Schema migration canonicalizes headers by numeric COLS index](docs/archive/adr/from-docs-adr/0176-schema-migration-canonicalizes-by-numeric-column-index.md) |
| 0177 | [Schema migration rollback restores data by snapshot, but rec](docs/archive/adr/from-docs-adr/0177-schema-migration-rollback-recomputes-derived-state.md) |
| 0178 | [Three setupAll() guards ship as the go-live gate; the full m](docs/archive/adr/from-docs-adr/0178-schema-migration-go-live-gate-and-release-invariant.md) |