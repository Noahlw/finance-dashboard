# Staging is separate from production

Status: accepted

The project will maintain a separate staging Apps Script deployment and test spreadsheet for browser, integration, and receipt-upload validation. Automated tests must never write to production spreadsheets, Drive folders, Discord channels, or payout records.
