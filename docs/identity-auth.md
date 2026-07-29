## Identity & Authorization

This domain covers roles, authentication, and access control.

### Key decisions

- Committee operators and Treasurers use personal Google accounts
- Users sheet is the access allowlist
- Roles: Advisor/Auditor, Committee, Member, Treasurer
- SID is required identity, name is optional
- Operator creates members; member creation does not grant login
- Committee can reactivate members
- Member status changes are audited
- Spreadsheet-owner controls role flags
- Multiple active treasurers supported


### Source ADRs (8)

| # | Title |
|---|-------|
| 0016 | [Access requires Google identity and an active committee role](docs/archive/adr/from-docs-adr/0016-google-identity-and-active-role-authorization.md) |
| 0017 | [User provisioning remains Treasurer-controlled](docs/archive/adr/from-docs-adr/0017-treasurer-controlled-user-provisioning.md) |
| 0047 | [Authorized operators can view full Claim audit history](docs/archive/adr/from-docs-adr/0047-full-audit-history-for-authorized-operators.md) |
| 0060 | [The Users sheet is the access allowlist](docs/archive/adr/from-docs-adr/0060-users-sheet-is-the-access-allowlist.md) |
| 0078 | [Role promotion remains spreadsheet-only](docs/archive/adr/from-docs-adr/0078-spreadsheet-only-role-promotion.md) |
| 0079 | [Spreadsheet Owner controls future role flags](docs/archive/adr/from-docs-adr/0079-spreadsheet-owner-controls-role-flags.md) |
| 0114 | [SID remains the cross-year Member identity](docs/archive/adr/from-docs-adr/0114-sid-is-cross-year-member-identity.md) |
| 0118 | [SID is unique within an annual file](docs/archive/adr/from-docs-adr/0118-sid-uniqueness-per-annual-file.md) |