# Repository Guidelines

## Project Structure

The root contains the Google Apps Script backend (`Api.js`, `Engine.js`, `Config.js`, `Setup.js`, `Jobs.js`, and domain modules) plus `appsscript.json`. Tests live in `tests/`; architecture decisions, specifications, and plans live in `docs/`. `src/frontend/` is the React/Vite web UI, and the root `index.html` is its generated Apps Script artifact. Static assets include root SVGs and frontend assets.

## Build, Test, and Development Commands

- `npm install` installs the root Jest, Puppeteer, and Apps Script tooling.
- `npm test` runs the Jest suite.
- `cd src/frontend && npm install` installs frontend dependencies.
- `cd src/frontend && npm run dev` starts the Vite development server.
- `cd src/frontend && npm run build` type-checks and builds the Vite client into the repository root.
- `cd src/frontend && npm run lint` runs Oxlint.

## Coding Style & Naming

Use two-space indentation, semicolons, and small, focused JavaScript functions. Use `camelCase` for functions and variables, `PascalCase` for React components and TypeScript types, and descriptive module filenames such as `AppSheetApi.js`. Keep shared sheet names, columns, statuses, and IDs in the existing constants/config modules rather than duplicating string literals.

## Testing Guidelines

Add Jest tests under `tests/` with the `.test.js` suffix for backend behavior. Preserve the existing test harness and isolate external Sheets/Drive effects through the provided helpers. Run `npm test` before submitting; no repository-wide coverage threshold is currently documented. Frontend changes should also pass `npm run lint` and `npm run build`.

## Roadmap and Product Direction

The current GitHub roadmap targets a code-managed React/Vite web app served by Apps Script HTML Service for phone and desktop users. AppSheet is fully abandoned; Google Sheets and Drive remain the data/reporting layer. Receipt photos should be uploaded through the web UI and stored through the existing Apps Script/Drive flow. Do not delete `src/frontend/` or the root artifact. See the active Wayfinder map and tickets #27–#32 for identity, UI parity, receipt handling, runtime validation, and AppSheet cleanup.

## Commits and Pull Requests

Use concise Conventional Commit-style subjects such as `feat: ...` and `docs: ...`. PRs should describe behavior changes, link the relevant issue, list verification commands, and include screenshots for UI work. Call out Apps Script, sheet-schema, or deployment-impacting changes explicitly.
