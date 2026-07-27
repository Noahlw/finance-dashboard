Part of #27
Cross-linked: #55, #59

## What to build

A Treasurer-facing "Failed Notifications" UI on the Dashboard, with a per-row **Retry** action that calls the existing backend `api_retryNotification` endpoint. This is a pure frontend wiring + dashboard surface ticket — the backend retry path already exists and works; the gap is that no React surface invokes it.

### Backend retry path that already exists (verified in this repo, do not rebuild)

- `api_retryNotification(deliveryId)` in `Api.js:3755-3777` — Treasurer-only (`_requireOperator` + `operator.role === ROLES.TREASURER` check, returns `UNAUTHORIZED` otherwise), delegates to `Discord.retry(deliveryId)` in `Discord.js:176-209`, writes an `Audit.append(... "RETRY_REQUESTED" ...)` row, returns `_ok({ delivery_id, status: "SENT" })` on success or `_err("DELIVERY_FAILED", result.reason)` on failure.
- `Discord.retry(deliveryId)` in `Discord.js:176-209` — refuses to retry anything whose current `status` is not `FAILED` (returns `ONLY_FAILED_DELIVERIES_CAN_BE_RETRIED`), re-POSTs the original webhook URL with the original payload, then calls `NotificationDeliveries.mark(deliveryId, ok ? "SENT" : "FAILED", ...)` to flip the row. The original delivery row's `entity_type`/`entity_id`/`message` are preserved.
- `api_getFailedNotifications()` in `Api.js:3741-3752` — Treasurer-only list endpoint. Returns `NotificationDeliveries.listFailed()` (defined in `NotificationDeliveries.js:29-51`), an array of `{ delivery_id, channel, entity_type, entity_id, status: "FAILED", attempts, last_error, updated_at }`.
- Both endpoints are exported from `Api.js:3800-3875` (see `api_retryNotification` at line 3857 and `api_getFailedNotifications` at line 3829) and routed to `google.script.run` by adding declarations to `src/frontend/src/global.d.ts` alongside the existing `api_retryPayout` / `api_getDashboardSummary` declarations near line 80-83.

### Frontend gap (verified)

- `src/frontend/src/services/api.ts` exposes a `retryPayout` binding (line 1353-1368) but **no `retryNotification` binding and no `getFailedNotifications` binding**.
- `src/frontend/src/global.d.ts` declares `api_retryPayout` and similar but **not** `api_retryNotification` / `api_getFailedNotifications`.
- `src/frontend/src/types.ts` has no `FailedNotification` interface (the only dashboard-related types are `DashboardSummary` / `DashboardCounts` / `FailedPayoutItem` at lines 358-404, none of which covers Discord failures).
- `src/frontend/src/DashboardView.tsx:152-330` renders the "Needs Attention" section and five drill-down tables (Missing Receipts, Over Budget Claims, Needs Information, Failed Payouts, Pending Budget Requests) — **no Failed Notifications surface**, even though `api_getDashboardSummary` could trivially include a count. A Treasurer today must open the sheet directly to see FAILED rows on the `NotificationDeliveries` tab.

### Where the UI goes

Add a sixth drill-down table to the existing "Needs Attention" block in `DashboardView.tsx`, rendered after the existing five sections and before the closing `</>`. Follow the same pattern as the `Failed Payouts` section at `DashboardView.tsx:282-306`: a `<section className="glass-card">` with a table whose columns are derived from `FailedNotification` (delivery id, channel, entity type, entity id, last error, attempts, updated at) plus a "Retry" action cell.

The Retry action must:

1. Call `apiService.retryNotification(deliveryId)` (new binding).
2. On success: re-fetch the failed-notifications list (do not optimistically mutate — the audit row written by `api_retryNotification` is the source of truth), and visually remove the row from the table.
3. On `DELIVERY_FAILED` from the server: re-fetch (the server's `mark` call may have changed `attempts` / `last_error`), and surface a non-blocking error message via the existing `showNotice` helper already imported in `DashboardView.tsx:2`.
4. Be disabled while the request is in flight (single-flight per row, no double-clicks).

Also add a `Failed Notifications` badge to the `attention-counts` strip at `DashboardView.tsx:156-185`, mirroring the existing `failed_payouts` badge pattern at lines 173-178. The count is derived from `failedNotifications.length` in the new list, not from `summary.counts` (which currently has no such field — see Out of scope).

`api_getFailedNotifications` is itself Treasurer-only, so gate the whole section on `role === "TREASURER"` (already enforced as a render-time check on the role prop in `DashboardView.tsx`). The backend will additionally reject non-Treasurers with `UNAUTHORIZED` if the UI gate is bypassed.

## Acceptance criteria

- [ ] `src/frontend/src/services/api.ts` exports two new methods on `apiService`: `getFailedNotifications(): Promise<FailedNotification[]>` and `retryNotification(deliveryId: string): Promise<{ delivery_id: string; status: "SENT" }>`. Each follows the same `google.script.run` wrapper / dev-mock pattern as the existing `getDashboardSummary` and `retryPayout` (api.ts:516-584 and 1353-1368 respectively).
- [ ] `src/frontend/src/types.ts` exports a `FailedNotification` interface matching the exact shape returned by `NotificationDeliveries.listFailed()` in `NotificationDeliveries.js:39-48`: `delivery_id: string; channel: string; entity_type: string; entity_id: string; status: "FAILED"; attempts: number; last_error: string; updated_at: string`.
- [ ] `src/frontend/src/global.d.ts` declares `api_getFailedNotifications(): void;` and `api_retryNotification(deliveryId: string): void;` (matching the form of the existing declarations at lines 80-83).
- [ ] `src/frontend/src/DashboardView.tsx` loads failed notifications alongside the existing `Promise.all([apiService.getDashboardSummary(), apiService.getSemesterStatus()])` at line 29, and renders a "Failed Notifications" drill-down table inside the existing `hasAttention` block (after the Pending Budget Requests section at line 308-330).
- [ ] Each row in the new table exposes a "Retry" button that calls `apiService.retryNotification(item.delivery_id)`, is disabled while the request is in flight, and re-fetches the list on completion regardless of outcome.
- [ ] A successful retry removes the row from the table without an error message; a failed retry re-renders the row with refreshed `attempts` / `last_error` and surfaces the server's error reason via `showNotice`.
- [ ] A `Failed Notifications` badge appears in the `attention-counts` strip at `DashboardView.tsx:156-185` when the list is non-empty, mirroring the existing `failed_payouts` badge (line 173-178).
- [ ] The new table and badge are visible only to Treasurers: the backend's `api_getFailedNotifications` and `api_retryNotification` are both Treasurer-only, and the existing `DashboardView` already gates the role on the `role` prop.
- [ ] No change to `api_retryNotification`, `api_getFailedNotifications`, `Discord.retry`, `NotificationDeliveries.listFailed`, or any `Api.js`/`Discord.js`/`NotificationDeliveries.js` file. The ticket is frontend-only.
- [ ] No new `failed_notifications` field on the `DashboardSummary` payload or `api_getDashboardSummary` response — the dashboard fetches the list via the dedicated `api_getFailedNotifications` endpoint rather than bloating the summary call.

## Out of scope

- Changing `Discord.retry`'s retry semantics, backoff, or failure handling (the existing one-shot POST-and-mark is the contract `api_retryNotification` exposes; this ticket does not modify it).
- Adding a `failed_notifications` count to `api_getDashboardSummary` / `DashboardSummary.counts` / `DashboardCounts`. The badge counts from the dedicated list endpoint instead. Adding it to the summary is a separate optimization and is not required for this ticket's behavior.
- Surfacing the audit `RETRY_REQUESTED` row in the UI. The audit chain already records every retry attempt (see `Api.js:3766-3772`); no new audit UI is in scope here.
- Bulk retry (selecting multiple failed deliveries and retrying them in one click). The button is per-row only; bulk is a separate UX decision.
- Retrying notifications that are currently `PENDING` or `SENT`. `Discord.retry` already rejects non-FAILED rows with `ONLY_FAILED_DELIVERIES_CAN_BE_RETRIED` (`Discord.js:181-183`); the UI never needs to know this rule.
- Auto-retry on page load. Retries are always explicit Treasurer action.
- A new ADR. No new domain decision is being made — this is mechanical frontend wiring onto an already-decided backend surface.
