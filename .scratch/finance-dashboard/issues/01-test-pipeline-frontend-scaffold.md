# 01 — Test Pipeline Foundation & Frontend Scaffolding

**What to build:** A complete "Hello World" deployment loop. Set up the local Jest testing environment. Scaffold the Vite/React app (`src/frontend`) to compile into a single `index.html`, and write the `doGet` Apps Script function to serve it. This proves our build, test, and routing infrastructure works before writing complex logic.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Set up local Jest environment in the root.
- [x] Scaffold Vite + React in `src/frontend` with configuration to output a single inline HTML file.
- [x] Create a `doGet` function that serves the compiled React app via `HtmlService.createHtmlOutputFromFile('index')`.
- [x] Write a basic Jest test to verify the test pipeline is working.
