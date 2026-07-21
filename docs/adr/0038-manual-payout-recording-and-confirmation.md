# Payouts are recorded and confirmed manually

Status: accepted

V1 will not integrate directly with FPS or PayMe. After a Claim is approved for payout, the Treasurer sends the payment externally, records the method, transaction reference, and sent timestamp in the web app, then confirms receipt separately. Confirmation moves the Claim to `PAID`; later processing moves it to `LOCKED`.
