# Claim payment details use conditional methods

Status: accepted

Every Claim will carry its own payment details. The web form defaults to `FPS` and offers `FPS`, `PAYME`, and `OTHER`: FPS requires a phone number and destination account; PayMe requires exactly one of a Payment QR Code or a phone number; Other requires free-text payment information. A Payment QR Code is distinct from a purchase Receipt and must not be treated as one.
