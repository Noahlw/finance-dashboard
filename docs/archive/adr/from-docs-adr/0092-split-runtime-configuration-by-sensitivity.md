# Runtime configuration is split by sensitivity

Status: accepted

Spreadsheet Config stores editable operational values such as the Discord follow-up role ID and environment labels. Apps Script Properties stores webhook URLs, Drive folder IDs, spreadsheet IDs, and other secrets or deployment-specific identifiers. Source code contains no environment secrets or hard-coded deployment identifiers.
