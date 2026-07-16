# Next.js + Google Sheets API Security & Data Flow

To ensure the Next.js Hybrid Web App is robust against fraud, race conditions, and payload limits, we have adopted three critical architectural patterns for the Submit flow.

1. **Strict Backend Authorization (IDOR Prevention)**: 
   The Next.js backend accesses the Google Sheet using a highly-privileged Google Service Account. All mutating Server Actions (e.g., `editClaim`) MUST verify the authenticated user's session email (via NextAuth) matches the `Submitter Email` recorded on the target row before executing the Google Sheets API update.

2. **Idempotency Keys (Double-Spend Prevention)**:
   Network retries can cause Next.js Server Actions to execute multiple times. Since Google Sheets `spreadsheets.values.append` is not natively idempotent, the React frontend must generate a unique UUID for each claim session. The backend MUST check if this UUID already exists in the sheet before appending a new row.

3. **Pre-Upload Receipts**:
   To prevent Vercel Serverless Function timeouts, massive Base64 receipt images MUST be uploaded to Google Drive asynchronously before the final claim form is submitted. The "Submit Claim" button remains disabled until the Drive URLs are returned.
