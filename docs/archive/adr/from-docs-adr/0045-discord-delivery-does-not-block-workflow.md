# Discord delivery does not block Claim workflow

Status: accepted

A Discord webhook failure must not roll back or prevent a Claim’s transition to `NEEDS_INFO`. The app records the state and request note as authoritative, logs the notification failure, and provides a retry or Treasurer-attention path.
