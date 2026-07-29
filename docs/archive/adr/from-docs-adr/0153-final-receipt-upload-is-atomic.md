# Final Receipt upload is atomic with Claim submission

Status: accepted

When final Claim submission uploads Receipts but the Claim transaction fails, the newly uploaded files are rolled back or deleted. A retry must not leave orphaned files or duplicate Claim attachments.
