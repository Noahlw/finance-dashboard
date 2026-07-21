# Receipt and payment files use a bounded upload contract

Status: accepted

Purchase Receipts accept image or PDF files up to 5 MB each, with multiple files allowed per Claim. PayMe Payment QR Codes accept image files up to 5 MB and are mutually exclusive with the PayMe phone-number option. Unsupported or oversized files must be rejected with a clear UI error.
