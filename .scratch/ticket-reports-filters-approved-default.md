Part of #27
Cross-linked: #55, #59

## Defect

The React `ReportsView` (`src/frontend/src/ReportsView.tsx`) is read-only and ships with two defects that block the "full operator-facing workspace" pre-launch bar locked in #55 / #59:

1. **No approved-only default.** Initial filter state is `useState<ReportFilters>({})` (`ReportsView.tsx:51`) — empty. Every operator-facing tab therefore loads all records, including DRAFTs, pending, rejected, needs-info, etc. The closing comment on #55 ("Set approved-only default for reports…") and the resolution on #59 (line "Reports approved-only default + 3 filters") both lock this as a pre-launch requirement. Switching tabs at `ReportsView.tsx:92-103` then calls `setFilters({})` again, wiping any user selection back to "all records".
2. **Two filters the Reports type/backend already supports are missing from the rendered UI.** The `ReportFilters` interface (`src/frontend/src/types.ts:413-419`) declares five optional fields — `budgetLine`, `eventId`, `fromDate`, `status`, `toDate`. The ReportsView filter row (`ReportsView.tsx:107-153`) only renders the latter three: a `<select>` for `status`, an `input type="date"` for `fromDate`, and an `input type="date"` for `toDate`. The Claims-specific `_buildClaimsReport` (`Api.js:2934-3006`) explicitly reads `filters.eventId` and `filters.budgetLine` from the same `ReportFilters` payload — the backend accepts them, but no UI control emits them, so the operator cannot filter claims by Event or Budget Line today.

**About "creator"**: the `creator` filter exists on the separate `ClaimQueueFilters` interface (`src/frontend/src/types.ts:263-269`) and is consumed by `api_getClaimsQueue` (`Api.js:1927-1931`) for the Claim review queue — that path is unrelated to Reports. `ReportFilters` does not contain `creator`, and `_buildClaimsReport` does not read it. Adding a `creator` input to the Reports view would be a wire-up of a filter the Reports backend does not understand. This ticket therefore covers the two filters the Reports path actually supports; a creator-filter-on-Reports is a separate, larger change that would extend `ReportFilters` first and so is explicitly out of scope.

## What to build

In `src/frontend/src/ReportsView.tsx`:

1. Add an `eventId` free-text `<input>` (placeholder "Event ID") to the `.report-filters` row next to the existing controls. Writing it sets `filters.eventId` via the same `setFilters((f) => ({ ...f, eventId }))` pattern. Visible on the Claims tab only — hide for Budget/Income/Payouts/Accounts (only Claims honours these filters in the backend at `Api.js:2941-2943`).
2. Add a `budgetLine` free-text `<input>` (placeholder "Budget Line ID") to the same row, same show/hide rule (Claims tab only).
3. Change the initial filters from `useState<ReportFilters>({})` (currently `ReportsView.tsx:51`) so each per-tab approved-only default applies. Approved-only defaults per tab:
   - `claims`: `status: "APPROVED_FOR_PAYOUT"` (the `APPROVED_FOR_PAYOUT` value comes from `STATUS_OPTIONS.claims` at `ReportsView.tsx:31-40`; do not introduce a new constant — reuse what the dropdown already offers).
   - `budget`: `status: "APPROVED"` (matches `STATUS_OPTIONS.budget`).
   - `income`: `status: "CONFIRMED"` (matches `STATUS_OPTIONS.income`).
   - `payouts`: `status: "CONFIRMED"` (matches `STATUS_OPTIONS.payouts`).
   - `accounts`: default to `{}` (Accounts has no status dropdown — `STATUS_OPTIONS.accounts: []` at `ReportsView.tsx:20` — and `_buildAccountsReport` ignores filters entirely per `Api.js:3168-3188`, so no default is meaningful there).
4. Update the tab-button `onClick` (currently `ReportsView.tsx:92-103` — `setActiveTab(t.type); setShowMigration(false); setFilters({});`) to call a helper that resets to the approved-only default for the new tab instead of `{}`. Each tab transition should land on the operator-facing approved-only view, not a blank "all records" state.
5. Update the existing "Clear" button (`ReportsView.tsx:139-144`) so clearing means "back to the active tab's approved-only default", not "empty filter object". Optional: provide a separate explicit "Show all" affordance only if the existing `Clear` button's behaviour is preserved as a toggle; do not silently weaken the default by overloading `Clear`.

No backend change is required (`api_getReportsData` at `Api.js:2909-2932` already accepts and respects every filter the new UI sends; CSV export at `Api.js:3194-3330` calls through to the same backend with the same `filters`, so it picks up the new defaults automatically).

## Acceptance criteria

- [ ] Loading the Reports view on the Claims tab renders rows filtered to `status === "APPROVED_FOR_PAYOUT"`; Budget to `status === "APPROVED"`; Income to `status === "CONFIRMED"`; Payouts to `status === "CONFIRMED"`; Accounts to all accounts.
- [ ] The initial `useState<ReportFilters>` value at `ReportsView.tsx:51` is no longer `{}` — it computes the per-tab approved-only default for the initial `activeTab: "claims"` (`status: "APPROVED_FOR_PAYOUT"`).
- [ ] Clicking any tab button in `ReportsView.tsx:92-103` re-applies the new tab's approved-only default to the filter state, not `{}`.
- [ ] On the Claims tab, an "Event ID" free-text input and a "Budget Line ID" free-text input appear in `.report-filters`; typing into either causes the row count to update, demonstrating backend filtering by `eventId` and `budgetLine` (the only two filters `_buildClaimsReport` at `Api.js:2934-3006` actually consumes).
- [ ] The two new inputs are hidden on the Budget, Income, Payouts, and Accounts tabs (the backend ignores them for those report types anyway, and hiding avoids operator confusion).
- [ ] The "Export CSV" button (`ReportsView.tsx:144-149` + `handleExportCsv` at `ReportsView.tsx:72-90`) exports rows matching the visible (filtered) view — i.e. it picks up the new defaults and any user-entered `eventId`/`budgetLine` like it already picks up the other filters.
- [ ] The existing clear-button behaviour at `ReportsView.tsx:139-144` either resets to the approved-only default for the active tab, or the implementation introduces an explicit "Show all" affordance documented in code so a reviewer can verify the default isn't silently weakened.
- [ ] No new constant is introduced for approved-status strings — reuse the values already present in `STATUS_OPTIONS` at `ReportsView.tsx:21-43`.

## Out of scope

- Adding a `creator` filter to the Reports view. `ReportFilters` (`src/frontend/src/types.ts:413-419`) does not contain `creator`, and `_buildClaimsReport` (`Api.js:2934-3006`) does not read it. Wiring a `creator` input would require first extending `ReportFilters` and `_buildClaimsReport`, which is a separate, larger change. This ticket only covers the filters the Reports API already accepts.
- Backend changes to `_buildBudgetReport`, `_buildIncomeReport`, `_buildPayoutsReport`, or `_buildAccountsReport` (`Api.js:3007-3188`) to add `eventId`/`budgetLine` filtering. These report types do not currently honour those filters, and the ticket covers only the UI of the Reports view.
- Per-event or per-budget-line dropdown population. The inputs are free-text — the underlying columns are already string IDs (`event_id`, `budget_line_id`), and there is no picker list endpoint to populate yet (Event picker itself is a separate ticket per #59 / ADR 0073).
- New status filters beyond what `STATUS_OPTIONS` (`ReportsView.tsx:21-43`) already enumerates — the existing per-tab status options are the source of truth.
- Any change to `api_exportCsv` (`Api.js:3194-3330`) — the existing export passes the same `filters` through, so once the UI sends the right filters, the export follows automatically.
