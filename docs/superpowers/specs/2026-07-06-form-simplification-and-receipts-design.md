# Budget System Redesign: Form Simplification and Receipt Integration

## Purpose
The CF-Ledger expense claim and budget request forms are currently too long and complex because they hardcode three budget lines per submission. Additionally, receipt handling lacks UI integration (no clickable links to photos) and critical financial controls (missing verification checks). This redesign simplifies the forms, integrates receipt photos directly into the ledger, and tightens financial controls.

## Proposed Changes

### 1. Form Simplification (Option A)
- **Concept:** One budget line per form submission. Users splitting a receipt will submit the form multiple times.
- **FormSetup.js:** Remove generation of Line 2 and Line 3 for both `_buildRequestForm` and `_buildClaimForm`.
- **IntakeForms.js:** Remove the loop that iterates through Lines 1-3. Process only Line 1.

### 2. Receipt Photo Integration
- **Deduplication Logic:** In `IntakeForms.js` (`IntakeForms_storeReceipt`), we currently throw a hard error if the exact same receipt photo (SHA-256 hash) is uploaded. We will update this so that if a duplicate hash is detected, it silently returns the existing `receiptId` instead of throwing an error. This elegantly handles receipt splitting by letting multiple claim lines point to the same underlying Receipt row.
- **UI Integration:** We will modify `IntakeForms_storeReceipt` to write a clickable Google Drive file hyperlink into a new `file_link` column in the `Receipts` tab, allowing the Treasurer to view receipts with one click.

### 3. Financial Controls
- **VERIFY Invariants:** Update `Engine._validateClaimVerification` to implement the documented but missing controls:
  - Enforce that the sum of all `ClaimLineItems` amounts for a given `receipt_id` does not exceed the `Receipt.receipt_total`.
  - Ensure every claim line has a valid `receipt_id` or an approved missing-receipt flag.
