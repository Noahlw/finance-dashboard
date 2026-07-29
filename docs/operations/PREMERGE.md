# Pre-merge Gate System

This repository enforces automated quality checks on all Pull Requests targeting the `main` branch before code can be merged.

## Overview

The Pre-merge Gate is implemented as a GitHub Actions workflow defined in `.github/workflows/premerge-gate.yml`.

It runs three parallel validation jobs:

1. **Lint & Code Standards (`lint`)**: Executes `npm run lint` (`ultracite check`) to enforce formatting and linting rules.
2. **Backend Jest Tests (`test`)**: Executes `npm test` (`jest`) across backend and domain module test suites.
3. **Frontend Build & Typecheck (`build`)**: Runs `npm run build` (`tsc -b` + Vite single-file bundler) to ensure React/Vite web UI compiles cleanly into `index.html`.

A final summary job named **`premerge-pass`** aggregates the results of all three parallel jobs.

## GitHub Branch Protection Setup

To require these checks before merging:

1. Go to the repository on GitHub: **Settings** -> **Branches**.
2. Under **Branch protection rules**, click **Add branch protection rule** (or edit the rule for `main`).
3. Set **Branch name pattern** to `main`.
4. Check **Require a pull request before merging**.
5. Check **Require status checks to pass before merging**.
6. In the status checks search box, search for and select:
   - `premerge-pass`
7. (Optional) Check **Require branches to be up to date before merging**.
8. Click **Save changes**.

## Running Pre-merge Verification Locally

Before opening or pushing a PR, developers can run the full suite locally:

```bash
npm run verify
```

`npm run verify` executes `npm test`, `npm run build`, and `npm run lint` in sequence.
