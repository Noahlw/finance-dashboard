# Airtable Scripting Research

## 1. Automation Run Limits

**Do scripts triggered by Airtable Interface buttons count towards the workspace's monthly Automation run limits?**

Yes. Every time a user clicks a button in an Interface that is configured to trigger an automation, **it counts as one automation run**. 
- Regardless of how many actions are inside that automation (e.g., updating a record, running a script, or sending an email), the entire process counts as exactly one run.
- These runs contribute directly to your workspace's total monthly automation limits (e.g., Free Plan: 100 runs/month, Team Plan: 25,000 runs/month, Business Plan: 100,000 runs/month).

*Note: You can track your workspace's total monthly automation usage in Workspace Settings > Billing.*

## 2. Execution Limits

**What are the execution limits (time, memory) for a button-triggered script?**

An interface button triggering a script runs as an **Automation Script** on Airtable's servers, which enforces strict technical limits:
- **Execution Time Limit:** 30 seconds. If a script exceeds this, it will timeout and fail.
- **Memory Limit:** 512 MB.
- **Data Payload Limit:** There is a 6 MB hard cap on the data payload shared via `input` and `output` APIs within a single script action.
- **API Call Limits:** Up to 50 `fetch` requests per script execution, 30 `selectRecords` queries, and a limit of 15 mutations per second.

*Tip for managing limits: Never update, create, or delete records one by one in a loop. Always batch operations using `updateRecordsAsync` or `createRecordsAsync` (max 50 records per batch).*

## 3. Outbound HTTP Requests

**How to make outbound HTTP requests (e.g., fetch to a Discord webhook) from an Airtable Script, and are there any restrictions?**

You can make outbound HTTP requests using the standard `fetch()` API or Airtable's `remoteFetchAsync()` function. Since automation scripts execute on Airtable's backend servers, standard `fetch()` calls function as backend requests and bypass browser CORS restrictions (unlike Scripting Extensions).

**Restrictions & Considerations:**
- **Execution Timeout:** The request must complete within the script's overall 30-second time budget.
- **Volume Limit:** A maximum of 50 fetch requests can be made per single script execution. 
- **Local Network Blocks:** You cannot make requests to local IP addresses (e.g., `127.0.0.1` or `192.168.x.x`). Requests must be made to publicly accessible endpoints.

*Tip for integrations: For heavy logic, use the script to simply ping a webhook (e.g., Make.com, Zapier, or a custom backend) and offload the processing to prevent 30-second execution timeouts.*
