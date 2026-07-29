## Architecture & Deployment

This domain covers system architecture, deployment, configuration, and testing.

### Key decisions

- Code-managed React/Vite web app served by Apps Script HTML Service
- Online-only v1 (no offline queue)
- Mobile-first browser support
- Repository-driven Apps Script deployment
- Separate staging environment
- Explicit production release approval
- Runtime configuration split by sensitivity
- Users sheet is the access allowlist
- Multiple active treasurers
- Curated dashboard views, swipeable on mobile
- Separate claim and budget request flows


### Source ADRs (52)

| # | Title |
|---|-------|
| 0001 | [0001: Allow Duplicate Receipt Uploads for Receipt Splitting](docs/archive/adr/from-docs-adr/0001-allow-duplicate-receipt-uploads-for-splitting.md) |
| 0003 | [3. Deep Module Script Architecture](docs/archive/adr/from-docs-adr/0003-deep-module-script-architecture.md) |
| 0004 | [Next.js + Google Sheets API Security & Data Flow](docs/archive/adr/from-docs-adr/0004-nextjs-google-sheets-security.md) |
| 0005 | [5. Local Ephemeral E2E Testing](docs/archive/adr/from-docs-adr/0005-local-ephemeral-e2e-testing.md) |
| 0007 | [Web app is operated by committee members](docs/archive/adr/from-docs-adr/0007-committee-operated-web-app.md) |
| 0009 | [Web access is limited to committee operators](docs/archive/adr/from-docs-adr/0009-committee-and-treasurer-web-access.md) |
| 0011 | [Receipts are recommended but not required at claim intake](docs/archive/adr/from-docs-adr/0011-receipts-are-recommended-not-required.md) |
| 0012 | [Missing receipts are explicit claim flags](docs/archive/adr/from-docs-adr/0012-missing-receipt-is-an-explicit-flag.md) |
| 0024 | [Receipt metadata is optional at intake](docs/archive/adr/from-docs-adr/0024-optional-receipt-metadata.md) |
| 0034 | [Claims may be linked to Events later](docs/archive/adr/from-docs-adr/0034-delayed-event-linking.md) |
| 0035 | [Event association follows Claim mutability](docs/archive/adr/from-docs-adr/0035-state-based-event-association-edits.md) |
| 0043 | [Discord follow-up role is spreadsheet-configured](docs/archive/adr/from-docs-adr/0043-configurable-discord-follow-up-role.md) |
| 0045 | [Discord delivery does not block Claim workflow](docs/archive/adr/from-docs-adr/0045-discord-delivery-does-not-block-workflow.md) |
| 0048 | [Committee work uses shared queues](docs/archive/adr/from-docs-adr/0048-shared-committee-queues.md) |
| 0049 | [Shared queues cover all finance workflows](docs/archive/adr/from-docs-adr/0049-shared-queues-cover-all-finance-workflows.md) |
| 0055 | [Web app provides finance reports and CSV exports](docs/archive/adr/from-docs-adr/0055-reports-and-csv-exports.md) |
| 0056 | [V1 is online-only](docs/archive/adr/from-docs-adr/0056-online-only-v1.md) |
| 0057 | [The committee web app is mobile-first](docs/archive/adr/from-docs-adr/0057-mobile-first-browser-support.md) |
| 0058 | [Receipt intake supports mobile and desktop file selection](docs/archive/adr/from-docs-adr/0058-mobile-and-desktop-receipt-picker.md) |
| 0059 | [Apps Script web app runs as the accessing user](docs/archive/adr/from-docs-adr/0059-accessing-user-web-deployment.md) |
| 0061 | [Multiple active Treasurers are supported](docs/archive/adr/from-docs-adr/0061-multiple-active-treasurers.md) |
| 0063 | [Dashboard uses swipeable mobile views](docs/archive/adr/from-docs-adr/0063-swipeable-mobile-dashboard-views.md) |
| 0064 | [Dashboard views are curated operational views](docs/archive/adr/from-docs-adr/0064-curated-dashboard-views.md) |
| 0073 | [Committee manages Events with Treasurer oversight](docs/archive/adr/from-docs-adr/0073-committee-event-management-treasurer-oversight.md) |
| 0074 | [Treasurer controls Categories and semester caps](docs/archive/adr/from-docs-adr/0074-treasurer-controls-categories-and-caps.md) |
| 0075 | [Member accounts and attendance are future landing-page capab](docs/archive/adr/from-docs-adr/0075-future-member-accounts-and-attendance.md) |
| 0076 | [Future Member Accounts do not require Google identity](docs/archive/adr/from-docs-adr/0076-member-accounts-are-app-managed.md) |
| 0077 | [Future member registration proof is deferred](docs/archive/adr/from-docs-adr/0077-defer-member-registration-proof.md) |
| 0082 | [Same-operator duplicate Receipts are reused](docs/archive/adr/from-docs-adr/0082-same-operator-reuses-hashed-receipts.md) |
| 0088 | [Discord notifications are scoped to actionable events](docs/archive/adr/from-docs-adr/0088-scoped-discord-notifications.md) |
| 0089 | [Production deployment is repository-driven](docs/archive/adr/from-docs-adr/0089-repository-driven-apps-script-deployment.md) |
| 0090 | [Production releases require explicit approval](docs/archive/adr/from-docs-adr/0090-explicit-production-release-approval.md) |
| 0091 | [Staging is separate from production](docs/archive/adr/from-docs-adr/0091-separate-staging-environment.md) |
| 0092 | [Runtime configuration is split by sensitivity](docs/archive/adr/from-docs-adr/0092-split-runtime-configuration-by-sensitivity.md) |
| 0106 | [Committee Operators can add new Member records](docs/archive/adr/from-docs-adr/0106-committee-adds-new-members.md) |
| 0117 | [Inactive migrated members cannot start new Claims](docs/archive/adr/from-docs-adr/0117-inactive-members-cannot-start-new-claims.md) |
| 0119 | [Member creation does not grant login access](docs/archive/adr/from-docs-adr/0119-member-creation-does-not-grant-login.md) |
| 0120 | [Committee and Treasurer can reactivate members](docs/archive/adr/from-docs-adr/0120-committee-can-reactivate-members.md) |
| 0121 | [Member status changes are audited](docs/archive/adr/from-docs-adr/0121-member-status-changes-are-audited.md) |
| 0125 | [Committee year number auto-increments](docs/archive/adr/from-docs-adr/0125-committee-year-number-auto-increments.md) |
| 0132 | [Primary Treasurer is preselected during migration](docs/archive/adr/from-docs-adr/0132-primary-treasurer-is-preselected.md) |
| 0135 | [Opening balances are prefilled for confirmation](docs/archive/adr/from-docs-adr/0135-opening-balances-are-prefilled-for-confirmation.md) |
| 0136 | [Opening-balance differences are audited](docs/archive/adr/from-docs-adr/0136-opening-balance-differences-are-audited.md) |
| 0138 | [New accounts require opening balances](docs/archive/adr/from-docs-adr/0138-new-accounts-require-opening-balances.md) |
| 0147 | [Out-of-range expenses use the current open Semester](docs/archive/adr/from-docs-adr/0147-out-of-range-expenses-use-current-semester.md) |
| 0149 | [Future Expense Dates are allowed](docs/archive/adr/from-docs-adr/0149-future-expense-dates-are-allowed.md) |
| 0152 | [Receipt-total overage is a warning](docs/archive/adr/from-docs-adr/0152-receipt-total-overage-is-a-warning.md) |
| 0154 | [Cross-operator Receipt duplicates require review](docs/archive/adr/from-docs-adr/0154-cross-operator-receipt-duplicates-require-review.md) |
| 0170 | [Committee and Treasurer can create finance records](docs/archive/adr/from-docs-adr/0170-committee-and-treasurer-can-create-finance-records.md) |
| 0174 | [Rejection permissions follow record type](docs/archive/adr/from-docs-adr/0174-rejection-permissions-follow-record-type.md) |
| 0179 | [Initial production go-live is owner-approved against staging](docs/archive/adr/from-docs-adr/0179-initial-go-live-approval-is-owner-gated-checklist-evidenced.md) |
| 0180 | [Legacy free-text eventId values are never backfilled; manual](docs/archive/adr/from-docs-adr/0180-legacy-eventid-values-never-backfilled-manual-relink-only.md) |