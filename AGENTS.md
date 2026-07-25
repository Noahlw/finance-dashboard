# Repository Guidelines

## Project Structure

The root contains the Google Apps Script backend (`Api.js`, `Engine.js`, `Config.js`, `Setup.js`, `Jobs.js`, and domain modules) plus `appsscript.json`. Tests live in `tests/`; architecture decisions, specifications, and plans live in `docs/`. `src/frontend/` is the React/Vite web UI, and the root `index.html` is its generated Apps Script artifact. Static assets include root SVGs and frontend assets.

## Build, Test, and Development Commands

- `npm install` installs the root Jest, Puppeteer, and Apps Script tooling.
- `npm test` runs the Jest suite.
- `cd src/frontend && npm install` installs frontend dependencies.
- `cd src/frontend && npm run dev` starts the Vite development server.
- `cd src/frontend && npm run build` type-checks and builds the Vite client into the repository root.
- `npm run lint` / `npm run check` runs Ultracite (Biome) across the repo.
- `npm run fix` auto-fixes Ultracite/Biome issues.
- `npx clasp push` deploys GAS modules and generated `index.html` to the bound Apps Script project.
- `npx clasp deploy` creates a versioned deployment of the Apps Script web app.

## Staging and Production

- Staging and production use separate Apps Script projects, spreadsheets, Drive folders, and Script Properties.
- Configure the staging project by copying `.clasp.json` to `.clasp.staging.json` with a separate `scriptId`.
- Production deployment requires explicit approval: build (`npm run build`), push (`npx clasp push`), and create a new deployment version.
- Automated tests must never mutate production data; staging browser tests use a dedicated test spreadsheet and folder.
- See `DEPLOY.md` for the full release checklist including rollback/disable guidance.

## Coding Style & Naming

Use two-space indentation, semicolons, and small, focused JavaScript functions. Use `camelCase` for functions and variables, `PascalCase` for React components and TypeScript types, and descriptive module filenames such as `CoreAudit.js`. Keep shared sheet names, columns, statuses, and IDs in the existing constants/config modules rather than duplicating string literals.

## Testing Guidelines

Add Jest tests under `tests/` with the `.test.js` suffix for backend behavior. Preserve the existing test harness and isolate external Sheets/Drive effects through the provided helpers. Run `npm test` before submitting; no repository-wide coverage threshold is currently documented. Frontend changes should also pass `npm run check` and `npm run build`.

## Roadmap and Product Direction

The current GitHub roadmap targets a code-managed React/Vite web app served by Apps Script HTML Service for phone and desktop users. AppSheet is fully abandoned; Google Sheets and Drive remain the data/reporting layer. Receipt photos should be uploaded through the web UI and stored through the existing Apps Script/Drive flow. Do not delete `src/frontend/` or the root artifact. See the active Wayfinder map and tickets #27–#32 for identity, UI parity, receipt handling, runtime validation, and AppSheet cleanup.

## Commits and Pull Requests

Use concise Conventional Commit-style subjects such as `feat: ...` and `docs: ...`. PRs should describe behavior changes, link the relevant issue, list verification commands, and include screenshots for UI work. Call out Apps Script, sheet-schema, or deployment-impacting changes explicitly.


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `npm exec -- ultracite fix`
- **Check for issues**: `npm exec -- ultracite check`
- **Diagnose setup**: `npm exec -- ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `npm exec -- ultracite fix` before committing to ensure compliance.
