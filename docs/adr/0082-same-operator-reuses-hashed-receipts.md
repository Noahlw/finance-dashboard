# Same-operator duplicate Receipts are reused

Status: accepted

When the same Committee Operator attaches an identical Receipt file to separate Claims, content-hash deduplication reuses the existing Receipt record and permits the split. An identical file attached by a different operator is flagged or blocked for Treasurer review. The existing receipt-splitting invariant remains applicable.
