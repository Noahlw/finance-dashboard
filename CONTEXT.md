# Budget System Context

The finance system for managing student club reimbursements via Google Apps Script and Google Sheets.

## Language

**Claim**:
A request for reimbursement for a specific purpose or event, associated with a single total amount. A claim does not track individual line items from a store.
_Avoid_: Reimbursement, Transaction, Line Item

**Receipt**:
An uploaded image or PDF providing proof of purchase attached to a Claim. A single Claim can have multiple Receipts.
_Avoid_: Proof, Invoice

**Status**:
The state of a Claim. It is a simple one-step flow: a Claim is created as `Submitted`. The committee reviews it and marks it as either `Reimbursed` (money transferred) or `Rejected` (fraudulent or invalid). There is no intermediate 'Approved' state.
_Avoid_: State, Approved, Paid

**Category**:
A fixed bucket of funds for the year (e.g. Marketing, Operations). Every Claim must be assigned to exactly one Category, and deducts from its total budget.
_Avoid_: Budget, Fund, Event

**Note**:
An optional text field on a Claim where the student can specify exactly what the expense was for (e.g., "Balloons for the Welcome Party").
_Avoid_: Description, Details

**Submitter**:
The person making the Claim. The system authenticates them via Google Login to securely capture their Email, but still requires them to manually input their Name and Student ID on the form.
_Avoid_: User, Applicant

**Payment Details**:
The information required to transfer money to the Submitter (e.g., FPS number, PayMe link). This is provided directly on every single Claim to keep the database perfectly flat, without relying on a separate relational User Profile.
_Avoid_: User Profile, Bank Info

**Mutability**:
Claims are editable by the Submitter up until the moment their Status changes to `Reimbursed` or `Rejected`. The backend must strictly enforce this state transition constraint to prevent fraud.
_Avoid_: Immutable, Locked

**Dashboard**:
The frontend interface for Submitters. Upon authenticating, they see a history of all their Claims and their current Status. They can launch the Edit flow for any Claim still in the `Submitted` state.
_Avoid_: User Page, Profile

**Admin Interface**:
The raw Google Sheet itself. The committee does not use a custom web UI to review claims; they manage the database directly in the spreadsheet, leveraging Google Sheets' native features for filtering and editing statuses.
_Avoid_: Admin Panel, CMS
