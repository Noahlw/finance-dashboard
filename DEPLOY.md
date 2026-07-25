# Deployment Guide

## Architecture

The Finance Workspace is a code-managed React/Vite web app served by Google Apps Script HTML Service. The deployment pipeline:

```
src/frontend/  ──(Vite build)──>  index.html (single-file, self-contained)
                                    │
Api.js, Engine.js, etc.             │
                                    ▼
                            npx clasp push  ──>  Apps Script Project
                                                     │
                                              npx clasp deploy ──>  Web App URL
```

## Pre-deployment Verification

Before deploying, verify:

1. **All tests pass:** `npm test`
2. **TypeScript compiles:** `cd src/frontend && npm run build`
3. **Lint is clean:** `cd src/frontend && npm run lint`
4. **The generated `index.html` is in the root directory** and contains the built UI

## Staging Deployment

Staging uses a separate Apps Script project, spreadsheet, and Drive folders. This prevents test data from contaminating production.

1. **Create staging clasp config:**
   ```bash
   cp .clasp.json .clasp.staging.json
   ```
   Edit `.clasp.staging.json` and set `scriptId` to the staging Apps Script project ID.

2. **Configure staging Script Properties** (in the staging Apps Script project editor):
   - `LEDGER_ID`: staging spreadsheet ID
   - `VAULT_ID`: staging vault spreadsheet ID
   - `RECEIPTS_FOLDER_ID`: staging Drive receipts folder
   - `TREASURY_WEBHOOK_URL`: staging Discord webhook (or blank)
   - `STATUS_WEBHOOK_URL`: staging Discord webhook (or blank)

3. **Build and push to staging:**
   ```bash
   npm run build           # Builds React app into root index.html
   npx clasp push          # Pushes to staging (if .clasp.json points there)
   # or: npx clasp push --project .clasp.staging.json
   ```

4. **Deploy staging:**
   ```bash
   npx clasp deploy --description "Staging - $(date +%Y-%m-%d)"
   ```
   Note the deployment ID and Web App URL for verification.

5. **Verify staging:**
   - Open the Web App URL and sign in
   - Verify session resolves correctly
   - Walk through all views (Review, Claims, Members, Budget Requests, Income, Payouts, Reports)
   - Verify closure/migration are functional (Treasurer only)

## Production Deployment

Production deployment requires explicit approval. The production spreadsheet and Drive folders must never be touched by automated tests.

1. **Ensure `.clasp.json` points to production:**
   ```bash
   cat .clasp.json | grep scriptId
   # Verify this is the PRODUCTION Apps Script project ID
   ```

2. **Run full verification suite:**
   ```bash
   npm test                                    # Backend tests
   cd src/frontend && npm run build && npm run lint  # Frontend build + lint
   ```

3. **Push to production:**
   ```bash
   npx clasp push
   ```
   This uploads all `.js`, `.gs` files, `appsscript.json`, and the generated `index.html`.

4. **Create a versioned deployment:**
   ```bash
   npx clasp deploy --description "Production - v1.0.0 - $(date +%Y-%m-%d)"
   ```
   Record the deployment ID and the public Web App URL.

5. **Smoke-test the production Web App:**
   - Open the Web App URL
   - Verify session auth works
   - Verify a claim can be created and viewed
   - Verify dashboard loads without errors

## Rollback

If the new deployment introduces issues:

1. **Redeploy a previous version:**
   ```bash
   npx clasp deploy --deploymentId <PREVIOUS_DEPLOYMENT_ID>
   ```

2. **Disable the web app entirely** (emergency only):
   - Go to the Apps Script project editor
   - Deploy > Manage deployments
   - Set web app deployment status to "Disabled"

3. **Restore from git:**
   ```bash
   git log --oneline -5          # Find last known-good commit
   git checkout <COMMIT_HASH>    # Restore source files
   npm run build                 # Rebuild frontend
   npx clasp push                # Push restored files
   npx clasp deploy --description "Rollback to <COMMIT_HASH>"
   ```

## Security and Operational Notes

- **Identity:** The web app executes as `USER_ACCESSING`. Every action is attributed to the signed-in Google account. The `Users` allowlist in the spreadsheet restricts access to Committee and Treasurer roles.
- **Secrets:** Store secrets (webhook URLs, IDs) in Apps Script Script Properties, not in source code or Git.
- **Editable config:** Operational values (semester dates, SLA hours, caps) are stored in the spreadsheet Config tab, editable by Treasurers without a code push.
- **File upload limits:** Receipts are capped at 5 MB per file. Apps Script HTML Service has a 50 MB total payload limit.
- **Quotas:** Consumer Google account quotas apply (URL Fetch calls, email send limits, script runtime). The system is designed to stay well within consumer quotas.
- **iframe limitations:** The Apps Script HTML Service renders in a sandboxed iframe. File download via Blob/URL.createObjectURL works within the sandbox for CSV exports.
- **No AppSheet dependency:** The system is fully independent of AppSheet. No AppSheet configuration, webhook, or endpoint remains.

## Environment Variables / Script Properties

| Property | Purpose | Set in |
|----------|---------|--------|
| `LEDGER_ID` | CF-Ledger spreadsheet ID | Script Properties |
| `VAULT_ID` | CF-Vault spreadsheet ID (PII) | Script Properties |
| `RECEIPTS_FOLDER_ID` | Drive folder for receipt uploads | Script Properties |
| `TREASURY_WEBHOOK_URL` | Discord webhook for treasury channel | Config tab or Script Properties |
| `STATUS_WEBHOOK_URL` | Discord webhook for status channel | Config tab or Script Properties |

All other operational parameters (semester dates, SLA hours, caps, etc.) are stored in the spreadsheet `Config` tab and are accessible to Treasurers for editing without a code push.
