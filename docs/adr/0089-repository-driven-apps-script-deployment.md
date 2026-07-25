# Production deployment is repository-driven

Status: accepted

The repository is the source of truth for Apps Script backend code, the built React artifact, manifest, and deployment commands. Production releases will build the frontend and push/deploy through version-controlled automation such as Vite and `clasp`; manual Apps Script editor changes are not part of the workflow. Spreadsheet configuration remains runtime data.
