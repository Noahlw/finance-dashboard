# 03 — The Claim Submission Slice (with Refactoring)

**What to build:** A student can submit a new claim via the React UI. Refactor the receipt/late logic out of `IntakeForms.js` into `Api.js`. Build the `api_submitClaim` backend endpoint (with idempotency checks), and build the React Form UI with async Google Drive receipt uploads.

**Blocked by:** 02 — The "My Claims" Dashboard Slice

**Status:** done

- [x] Refactor receipt duplicate hashing and late claim logic from `IntakeForms.js` to `Api.js`.
- [x] Build `api_submitClaim` in `Api.js` with IDOR checks and idempotency checks (UUID validation).
- [x] Build `api_uploadReceipt` in `Api.js` to handle async file uploads to Google Drive.
- [x] Build the React Submission Form UI with file upload capabilities.
- [x] Write Jest tests for the new `Api.js` endpoints.
