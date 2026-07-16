# 05 — Legacy Infrastructure Cleanup

**What to build:** Safely delete `FormSetup.js`, `IntakeForms.js`, and the legacy `Tests.js` framework now that the React UI and local Jest suite fully replace them.

**Blocked by:** 04 — The Claim Edit Slice

**Status:** done

- [x] Verify no code depends on `IntakeForms.js` or `FormSetup.js`.
- [x] Delete `IntakeForms.js`.
- [x] Delete `FormSetup.js`.
- [x] Delete `Tests.js` (assuming all tests were migrated to Jest).
