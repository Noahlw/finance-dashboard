# React web app is the interface for every role

Status: superseded by ADR-0007

The project will use a code-managed React/Vite web app served by Google Apps Script HTML Service as the user interface for submitters and committee roles. This replaces AppSheet and the previous assumption that committee members work directly in Google Sheets; Sheets and Drive remain the data and reporting layer. The decision prioritizes a version-controlled, AI-buildable interface that works on phone and desktop, including receipt-photo upload, at the cost of implementing role workflows and controls that AppSheet previously provided.
