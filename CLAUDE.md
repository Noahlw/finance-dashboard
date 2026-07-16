# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A finance dashboard for a university club's reimbursement system: **Google Apps Script (GAS) backend** (root `.js` files) + **React/Vite TypeScript frontend** (`src/frontend/`) + **Google Sheets database** (CF-Ledger) + **Discord webhooks** (notifications). No paid services, no servers.

**Required reading before non-trivial work**: `CONTEXT.md` (canonical glossary — use these terms exactly), and `.scratch/finance-dashboard/issues/*` (current build plan).

## Architecture

### Two projects in one repo

```
/
├── Api.js, Engine.js, Constants.js, ...   ← GAS backend (flat clasp project)
├── appsscript.json, .clasp.json           ← GAS deployment config
├── src/frontend/                          ← React/Vite TypeScript frontend
│   ├── src/App.tsx, main.tsx, types.ts
│   └── src/services/api.ts                ← calls backend via google.script.run
├── archive/gas/                           ← Archived old CF-Budget code (reference only)
├── docs/ and .scratch/                    ← Planning docs
├── CONTEXT.md, CLAUDE.md                  ← Project documentation
└── tests/                                 ← Jest test files
```

### GAS Backend (root level)

The root-level `.js` files form one flat GAS project deployed via clasp (`clasp push --force` from repo root). The **Engine** (`Engine.js`) is the sole mutator of status and audit data — all API entry points (`Api.js`) route through it. Key modules:

- `Constants.js` — tab names, column layouts, status enums, roles, ID prefixes (single source of truth)
- `Engine.js` — state machine transitions, the only code that writes status/amount columns
- `Api.js` — secure React-frontend-facing API (IDOR prevention via Session auth)
- `Audit.js` — SHA-256 hash-chained append-only audit log
- `CoreDecisions.js` / `CoreAudit.js` — pure logic extracted for testability
- `Config.js` — runtime config from the Config sheet tab
- `Ids.js` — semester-scoped sequential ID generation
- `Discord.js` — treasury channel notifications
- `Payouts.js`, `Approvals.js`, `Jobs.js`, `Onboarding.js`, `Setup.js` — additional subsystems

### React Frontend (`src/frontend/`)

Standard Vite + React + TypeScript setup. Runs in the browser as a GAS webapp, communicating with the backend via `google.script.run` calls. Key files:

- `src/App.tsx` — main app component
- `src/types.ts` — TypeScript interfaces matching backend data shapes
- `src/services/api.ts` — API abstraction layer (mocks for dev fallback when `google.script` is unavailable)

## Commands

```bash
npm test                 # Jest tests (covers pure logic in CoreDecisions, CoreAudit)
cd src/frontend && npm run dev   # Vite dev server for frontend work
```

### Deploying the GAS backend

```bash
clasp push --force       # Push root-level .js files to the bound GAS project
```

### Frontend build

```bash
cd src/frontend && npm run build   # Vite production build
```

## Key invariants

- **Engine is the sole mutator** — no code path outside `Engine.js` writes status, `*_by`/`*_at` stamps, or `approved_amount` columns. `Payouts.js` has its own simpler QUEUED→SENT→CONFIRMED lifecycle under the same rule.
- **Every mutation goes through `Audit.append()`** — SHA-256 hash-chained, append-only. No deletions or overwrites.
- **All policy values from Config tab** — never hard-code deadlines, caps, webhook URLs, or semester codes.
- **No PII in CF-Ledger or Discord** — Student IDs and payout handles live only in CF-Vault.
- **Money = Number, 2dp, HKD.** Timestamps = ISO-8601 strings via `Audit._nowIso()`.
- **ID prefixes** (`ENTITY_PREFIX` in `Constants.js`) are opaque, stable, sequential, semester-scoped. Never embed meaning into an ID.

## Archived code

Old CF-Budget code lives in `archive/gas/` for reference. It is not deployed and not actively maintained.
