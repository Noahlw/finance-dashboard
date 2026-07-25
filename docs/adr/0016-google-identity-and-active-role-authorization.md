# Access requires Google identity and an active committee role

Status: accepted

The web app will require a Google-authenticated session and resolve the account email against an active `Users` row. Only `COMMITTEE` and `TREASURER` roles may operate the app; unknown, inactive, `MEMBER`, and `ADVISOR_AUDITOR` accounts are denied. Anonymous sessions must never be treated as authorized operators.
