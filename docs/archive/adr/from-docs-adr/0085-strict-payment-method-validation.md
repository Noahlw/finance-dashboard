# Payment methods require complete conditional details

Status: accepted

The Claim form defaults to `FPS` and validates method-specific details before submission. FPS requires both a phone number and destination account; PayMe requires exactly one Payment QR Code or phone number; Other requires payment-information text. A Claim cannot be submitted with incomplete payout details.
