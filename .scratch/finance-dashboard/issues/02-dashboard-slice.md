# 02 — The "My Claims" Dashboard Slice

**What to build:** A student can visit the Web App and see a list of their past claims. Build the `api_getMyClaims` RPC wrapper (which enforces `Session.getActiveUser().getEmail()`) and the React Dashboard UI that fetches and renders the data.

**Blocked by:** 01 — Test Pipeline Foundation & Frontend Scaffolding

**Status:** done

- [x] Build `Api.js` with `api_getMyClaims` that queries `Engine` for claims matching the active user's email.
- [x] Write Jest tests for `api_getMyClaims` mocking `Session`.
- [x] Build the React Dashboard UI component.
- [x] Connect the React Dashboard to `google.script.run.api_getMyClaims` (with appropriate mocking for local dev).
- [x] Display the fetched claims in the UI.
