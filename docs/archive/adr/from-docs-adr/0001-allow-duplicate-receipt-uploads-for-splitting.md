# 0001: Allow Duplicate Receipt Uploads for Receipt Splitting

**Date:** 2026-07-06

## Status
Accepted

## Context
The expense claim form was redesigned to only allow one budget line per form submission (simplifying the UI and moving away from a complex, multi-line form). However, members frequently buy items for different budget categories on a single physical receipt (e.g., buying food and decorations at a supermarket). 
To split this receipt, the member must submit the expense claim form twice. Because Google Forms cannot dynamically carry over uploaded files between submissions, the member will naturally upload the exact same receipt photo twice.
Previously, the system strictly rejected duplicate file uploads based on SHA-256 hashes to prevent double-claiming. 

## Decision
We will relax the deduplication logic in `IntakeForms_storeReceipt`. If a duplicate file hash is detected, the system will check the `uploaderUserId`. 
- If the `uploaderUserId` matches the original uploader, the system will silently return the existing `receiptId` instead of throwing an error or creating a new Receipt row. This allows multiple claims to link to the same underlying Receipt.
- If the `uploaderUserId` does not match, the system will throw an error to prevent accidental or malicious copy-pasting of someone else's receipt.

## Consequences
- **Positive:** Members can seamlessly split receipts across multiple claims without complicated form logic. The database remains normalized (one Receipt row linked to multiple ClaimLineItems).
- **Negative:** The Treasurer must manually verify that the sum of claims against a split receipt doesn't exceed the receipt total. To mitigate this, we added an invariant to the `VERIFY` step in `Engine.js` that groups all claims by `receipt_id` and strictly enforces the `receipt_total` cap.
